import type {
  SpreadsheetCell,
  SpreadsheetRow,
} from '../../../shared/application/spreadsheet-reader.js';
import type { CategoryWithCount } from '../../categories/domain/category.js';
import type { CostCenter } from '../../cost-centers/domain/cost-center.js';
import type { EquipmentModel } from '../../equipment/domain/equipment-model.js';
import type {
  ProductChanges,
  ProductDraft,
} from '../../products/application/ports/product.repository.js';
import {
  formatInternalCode,
  normalizeProductCode,
  normalizeProductName,
  type Product,
  type UnitOfMeasure,
} from '../../products/domain/product.js';
import { pricePenFromWithIgv } from '../../settings/domain/pricing.js';
import {
  cellText,
  isBlankRow,
  matchKey,
  parseNumber,
  parseUnit,
  parseYesNo,
  roundTo,
} from '../domain/cell-values.js';
import {
  COLUMN_BY_KEY,
  IMPORT_COLUMNS,
  REQUIRED_HEADER_KEYS,
  type ImportColumnKey,
} from '../domain/product-import-columns.js';

export const MAX_IMPORT_ROWS = 2000;
const HEADER_SCAN_ROWS = 10;
const MAX_MONEY = 99_999_999;
const MAX_QUANTITY = 10_000_000;

export interface ImportLookups {
  categoryByKey: ReadonlyMap<string, number>;
  ambiguousCategoryKeys: ReadonlySet<string>;
  costCenterByKey: ReadonlyMap<string, number>;
  equipmentByKey: ReadonlyMap<string, number>;
  igvRate: number;
}

export interface ParsedImportRow {
  rowNumber: number;
  cells: Partial<Record<ImportColumnKey, SpreadsheetCell>>;
}

export interface ExtractedImportRows {
  fileErrors: string[];
  fileWarnings: string[];
  rows: ParsedImportRow[];
}

export interface RowIssue {
  column: string;
  message: string;
}

export interface PlannedRow {
  rowNumber: number;
  action: 'CREATE' | 'UPDATE';
  /** Code written in the file (normalized); null when the system will assign an internal one. */
  code: string | null;
  name: string | null;
  errors: RowIssue[];
  warnings: RowIssue[];
  create?: { draft: ProductDraft; equipmentIds: number[]; initialStock: number };
  update?: { productId: number; changes: ProductChanges; equipmentIds?: number[] };
}

/** "Parent > Child" for sub-categories, the plain name for top-level ones. */
export function categoryLabels(categories: readonly CategoryWithCount[]): Map<number, string> {
  const byId = new Map(categories.map((category) => [category.id, category]));
  return new Map(
    categories.map((category) => {
      const parent = category.parentId === null ? undefined : byId.get(category.parentId);
      return [category.id, parent ? `${parent.name} > ${category.name}` : category.name];
    }),
  );
}

export function buildLookups(
  categories: readonly CategoryWithCount[],
  costCenters: readonly CostCenter[],
  equipment: readonly EquipmentModel[],
  igvRate: number,
): ImportLookups {
  const labels = categoryLabels(categories);
  const categoryByKey = new Map<string, number>();
  const ambiguous = new Set<string>();

  // Unambiguous keys first: slug and full "Parent > Child" label.
  for (const category of categories) {
    categoryByKey.set(matchKey(category.slug), category.id);
    categoryByKey.set(matchKey(labels.get(category.id) ?? category.name), category.id);
  }
  // Plain names are accepted too, unless two categories share the same one.
  const byName = new Map<string, number[]>();
  for (const category of categories) {
    const key = matchKey(category.name);
    byName.set(key, [...(byName.get(key) ?? []), category.id]);
  }
  for (const [key, ids] of byName) {
    if (categoryByKey.has(key)) continue;
    if (ids.length === 1) categoryByKey.set(key, ids[0] as number);
    else ambiguous.add(key);
  }

  return {
    categoryByKey,
    ambiguousCategoryKeys: ambiguous,
    costCenterByKey: new Map(costCenters.map((center) => [matchKey(center.name), center.id])),
    equipmentByKey: new Map(equipment.map((model) => [matchKey(model.name), model.id])),
    igvRate,
  };
}

/** Finds the header row, maps columns and returns the non-empty data rows. */
export function extractImportRows(sheetRows: readonly SpreadsheetRow[]): ExtractedImportRows {
  const headerKeyByColumn = new Map(
    IMPORT_COLUMNS.map((column) => [matchKey(column.header), column.key]),
  );

  const headerRow = sheetRows.slice(0, HEADER_SCAN_ROWS).find((row) => {
    const keys = new Set(
      row.values.map((value) => headerKeyByColumn.get(matchKey(cellText(value) ?? ''))),
    );
    return REQUIRED_HEADER_KEYS.every((key) => keys.has(key));
  });

  if (!headerRow) {
    const needed = REQUIRED_HEADER_KEYS.map((key) => COLUMN_BY_KEY.get(key)?.header).join('" y "');
    return {
      fileErrors: [
        `No se encontró la fila de encabezados. El archivo debe tener al menos las columnas "${needed}"; descarga la plantilla para usar el formato correcto.`,
      ],
      fileWarnings: [],
      rows: [],
    };
  }

  const keyByIndex = new Map<number, ImportColumnKey>();
  const fileWarnings: string[] = [];
  headerRow.values.forEach((value, index) => {
    const text = cellText(value);
    if (text === null) return;
    const key = headerKeyByColumn.get(matchKey(text));
    if (key) keyByIndex.set(index, key);
    else fileWarnings.push(`La columna "${text}" no se reconoce y se ignora.`);
  });

  const rows: ParsedImportRow[] = [];
  for (const row of sheetRows) {
    if (row.rowNumber <= headerRow.rowNumber || isBlankRow(row.values)) continue;
    const cells: ParsedImportRow['cells'] = {};
    for (const [index, key] of keyByIndex) cells[key] = row.values[index] ?? null;
    rows.push({ rowNumber: row.rowNumber, cells });
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    return {
      fileErrors: [
        `El archivo tiene ${rows.length} filas con datos y el máximo por importación es ${MAX_IMPORT_ROWS}. Divídelo en varios archivos.`,
      ],
      fileWarnings,
      rows: [],
    };
  }
  return { fileErrors: [], fileWarnings, rows };
}

/** Codes written in the file, normalized, so existing products can be loaded in one query. */
export function codesIn(rows: readonly ParsedImportRow[]): string[] {
  const codes = new Set<string>();
  for (const row of rows) {
    const text = cellText(row.cells.code);
    if (text !== null) codes.add(normalizeProductCode(text));
  }
  return [...codes];
}

export function planProductImport(
  rows: readonly ParsedImportRow[],
  existingByCode: ReadonlyMap<string, Product>,
  lookups: ImportLookups,
  firstInternalSequence: number,
): PlannedRow[] {
  const firstRowOfCode = new Map<string, number>();
  let nextSequence = firstInternalSequence;

  return rows.map((row) => {
    const errors: RowIssue[] = [];
    const warnings: RowIssue[] = [];
    const header = (key: ImportColumnKey): string => COLUMN_BY_KEY.get(key)?.header ?? key;
    const fail = (key: ImportColumnKey, message: string) =>
      errors.push({ column: header(key), message });
    const warn = (key: ImportColumnKey, message: string) =>
      warnings.push({ column: header(key), message });
    const cell = (key: ImportColumnKey): SpreadsheetCell => row.cells[key] ?? null;
    const isFilled = (key: ImportColumnKey): boolean => {
      const value = cell(key);
      return typeof value === 'number' || typeof value === 'boolean' || cellText(value) !== null;
    };

    const text = (key: ImportColumnKey, max: number): string | undefined => {
      const value = cellText(cell(key));
      if (value === null) return undefined;
      if (value.length > max) {
        fail(key, `Máximo ${max} caracteres (tiene ${value.length}).`);
        return undefined;
      }
      return value;
    };

    const whole = (key: ImportColumnKey, min: number, max: number): number | undefined => {
      if (!isFilled(key)) return undefined;
      const parsed = parseNumber(cell(key));
      if (!parsed.ok || !Number.isInteger(parsed.value)) {
        fail(key, 'Debe ser un número entero, por ejemplo 10.');
        return undefined;
      }
      if (parsed.value < min || parsed.value > max) {
        fail(key, `Debe estar entre ${min} y ${max.toLocaleString('en-US')}.`);
        return undefined;
      }
      return parsed.value;
    };

    const money = (key: ImportColumnKey): number | undefined => {
      if (!isFilled(key)) return undefined;
      const parsed = parseNumber(cell(key));
      if (!parsed.ok) {
        fail(key, 'Debe ser un monto en soles, por ejemplo 18.50.');
        return undefined;
      }
      if (parsed.value < 0 || parsed.value > MAX_MONEY) {
        fail(key, `Debe estar entre 0 y ${MAX_MONEY.toLocaleString('en-US')}.`);
        return undefined;
      }
      return roundTo(parsed.value, 4);
    };

    // Identity -------------------------------------------------------------------------------
    const rawCode = text('code', 60);
    const code = rawCode === undefined ? null : normalizeProductCode(rawCode);
    const existing = code === null ? undefined : existingByCode.get(code);
    const action: PlannedRow['action'] = existing ? 'UPDATE' : 'CREATE';

    if (code !== null) {
      const firstRow = firstRowOfCode.get(code);
      if (firstRow === undefined) firstRowOfCode.set(code, row.rowNumber);
      else fail('code', `El código ${code} ya aparece en la fila ${firstRow}.`);
    }

    const rawName = text('name', 255);
    const name = rawName === undefined ? undefined : normalizeProductName(rawName);
    if (
      action === 'CREATE' &&
      name === undefined &&
      !errors.some((e) => e.column === header('name'))
    ) {
      fail('name', 'La descripción es obligatoria para productos nuevos.');
    }

    // Classification -------------------------------------------------------------------------
    let categoryId: number | undefined;
    const categoryText = cellText(cell('category'));
    if (categoryText !== null) {
      const key = matchKey(categoryText);
      if (lookups.ambiguousCategoryKeys.has(key)) {
        fail('category', `La categoría "${categoryText}" es ambigua; elige una de la lista.`);
      } else {
        categoryId = lookups.categoryByKey.get(key);
        if (categoryId === undefined)
          fail(
            'category',
            `La categoría "${categoryText}" no existe; elige una de la lista (hoja "Listas").`,
          );
      }
    }

    let costCenterId: number | undefined;
    const costCenterText = cellText(cell('costCenter'));
    if (costCenterText !== null) {
      costCenterId = lookups.costCenterByKey.get(matchKey(costCenterText));
      if (costCenterId === undefined)
        fail(
          'costCenter',
          `El centro de costo "${costCenterText}" no existe; elige uno de la lista (hoja "Listas").`,
        );
    }

    let unit: UnitOfMeasure | undefined;
    const unitText = cellText(cell('unit'));
    if (unitText !== null) {
      unit = parseUnit(unitText) ?? undefined;
      if (unit === undefined)
        fail('unit', `La unidad "${unitText}" no es válida; usa Unid., Pzas. o Set.`);
    }

    // Quantities -----------------------------------------------------------------------------
    const initialStock = whole('initialStock', 0, MAX_QUANTITY);
    if (initialStock !== undefined && existing) {
      warn(
        'initialStock',
        'Se ignora porque el producto ya existe; usa Registrar movimiento o un conteo físico para cambiar su stock.',
      );
    }
    const minStock = whole('minStock', 0, MAX_QUANTITY);
    const reorderQuantity = whole('reorderQuantity', 0, MAX_QUANTITY);
    const wholesaleMinQty = whole('wholesaleMinQty', 1, MAX_QUANTITY);

    // Money (stored in soles without IGV) ------------------------------------------------------
    const costPen = money('costPen');
    const priceWithIgv = money('priceWithIgvPen');
    const wholesaleWithIgv = money('wholesaleWithIgvPen');
    const pricePen =
      priceWithIgv === undefined
        ? undefined
        : pricePenFromWithIgv(priceWithIgv, { igvRate: lookups.igvRate });
    const wholesalePricePen =
      wholesaleWithIgv === undefined
        ? undefined
        : pricePenFromWithIgv(wholesaleWithIgv, { igvRate: lookups.igvRate });

    if (wholesalePricePen !== undefined) {
      const effectiveMinQty = wholesaleMinQty ?? existing?.wholesaleMinQty ?? null;
      if (effectiveMinQty === null && !errors.some((e) => e.column === header('wholesaleMinQty')))
        fail('wholesaleMinQty', 'Indica la cantidad mínima para el precio por mayor.');
    } else if (wholesaleMinQty !== undefined && (existing?.wholesalePricePen ?? null) === null) {
      warn('wholesaleMinQty', 'No se usa porque el producto no tiene precio por mayor.');
    }

    // Flags and links ------------------------------------------------------------------------
    let isConsignment: boolean | undefined;
    if (isFilled('consignment')) {
      const parsed = parseYesNo(cell('consignment'));
      if (parsed === null) fail('consignment', 'Escribe Sí o No.');
      else isConsignment = parsed;
    }

    let equipmentIds: number[] | undefined;
    const equipmentText = cellText(cell('equipment'));
    if (equipmentText !== null) {
      const unknown: string[] = [];
      const ids = new Set<number>();
      for (const token of equipmentText.split(/[;,\n]/)) {
        const name = token.trim();
        if (name === '') continue;
        const id = lookups.equipmentByKey.get(matchKey(name));
        if (id === undefined) unknown.push(name);
        else ids.add(id);
      }
      if (unknown.length > 0) fail('equipment', `Equipos que no existen: ${unknown.join(', ')}.`);
      else equipmentIds = [...ids];
    }

    const specification = text('specification', 500);
    const location = text('location', 60);
    const notes = text('notes', 4000);

    const planned: PlannedRow = {
      rowNumber: row.rowNumber,
      action,
      code,
      name: name ?? existing?.name ?? null,
      errors,
      warnings,
    };
    if (errors.length > 0) return planned;

    if (existing) {
      const changes: ProductChanges = {};
      if (name !== undefined) changes.name = name;
      if (specification !== undefined) changes.specification = specification;
      if (categoryId !== undefined) changes.categoryId = categoryId;
      if (costCenterId !== undefined) changes.costCenterId = costCenterId;
      if (unit !== undefined) changes.unit = unit;
      if (minStock !== undefined) changes.minStock = minStock;
      if (reorderQuantity !== undefined) changes.reorderQuantity = reorderQuantity;
      if (location !== undefined) changes.location = location;
      if (costPen !== undefined) changes.costPen = costPen;
      if (pricePen !== undefined) changes.pricePen = pricePen;
      if (wholesalePricePen !== undefined) changes.wholesalePricePen = wholesalePricePen;
      if (wholesaleMinQty !== undefined) changes.wholesaleMinQty = wholesaleMinQty;
      if (isConsignment !== undefined) changes.isConsignment = isConsignment;
      if (notes !== undefined) changes.notes = notes;

      if (Object.keys(changes).length === 0 && equipmentIds === undefined)
        warnings.push({
          column: header('code'),
          message: 'La fila no trae cambios para este producto.',
        });
      planned.update = { productId: existing.id, changes, equipmentIds };
      return planned;
    }

    planned.create = {
      draft: {
        code: code ?? formatInternalCode(nextSequence++),
        isInternalCode: code === null,
        name: name as string,
        description: null,
        specification: specification ?? null,
        categoryId: categoryId ?? null,
        costCenterId: costCenterId ?? null,
        unit: unit ?? 'PCS',
        minStock: minStock ?? 0,
        reorderQuantity: reorderQuantity ?? 0,
        location: location ?? null,
        costPen: costPen ?? null,
        pricePen: pricePen ?? null,
        wholesalePricePen: wholesalePricePen ?? null,
        wholesaleMinQty: wholesaleMinQty ?? null,
        isConsignment: isConsignment ?? false,
        notes: notes ?? null,
        isActive: true,
      },
      equipmentIds: equipmentIds ?? [],
      initialStock: initialStock ?? 0,
    };
    return planned;
  });
}
