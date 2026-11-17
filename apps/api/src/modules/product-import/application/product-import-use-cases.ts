import { Injectable } from '@nestjs/common';
import { SpreadsheetReader } from '../../../shared/application/spreadsheet-reader.js';
import { SpreadsheetWriter } from '../../../shared/application/spreadsheet-writer.js';
import { UnitOfWork } from '../../../shared/application/unit-of-work.js';
import { BusinessRuleError } from '../../../shared/domain/errors.js';
import { CategoryRepository } from '../../categories/application/ports/category.repository.js';
import { CostCenterRepository } from '../../cost-centers/application/ports/cost-center.repository.js';
import { EquipmentModelRepository } from '../../equipment/application/ports/equipment-model.repository.js';
import { StockLedger } from '../../inventory/application/stock-ledger.js';
import { ProductRepository } from '../../products/application/ports/product.repository.js';
import { GetPricingSettings } from '../../settings/application/use-cases/pricing-settings-use-cases.js';
import {
  IMPORT_COLUMNS,
  UNIT_TEMPLATE_LABELS,
  type ImportColumn,
} from '../domain/product-import-columns.js';
import {
  buildLookups,
  categoryLabels,
  codesIn,
  extractImportRows,
  planProductImport,
  MAX_IMPORT_ROWS,
  type PlannedRow,
  type RowIssue,
} from './plan-product-import.js';

const DATA_SHEET = 'Productos';

export interface ProductImportPreviewRow {
  rowNumber: number;
  action: 'CREATE' | 'UPDATE';
  /** Null when the system assigns an internal code. */
  code: string | null;
  name: string | null;
  errors: RowIssue[];
  warnings: RowIssue[];
}

export interface ProductImportPreview {
  fileErrors: string[];
  fileWarnings: string[];
  summary: {
    totalRows: number;
    toCreate: number;
    toUpdate: number;
    withErrors: number;
    withWarnings: number;
  };
  rows: ProductImportPreviewRow[];
}

export interface ProductImportResult {
  created: number;
  updated: number;
  initialStockMovements: number;
}

interface ImportPlan {
  fileErrors: string[];
  fileWarnings: string[];
  rows: PlannedRow[];
}

/** Reads the uploaded workbook and validates every row against the current catalogue. */
@Injectable()
export class ProductImportPlanner {
  constructor(
    private readonly reader: SpreadsheetReader,
    private readonly products: ProductRepository,
    private readonly categories: CategoryRepository,
    private readonly costCenters: CostCenterRepository,
    private readonly equipment: EquipmentModelRepository,
    private readonly pricingSettings: GetPricingSettings,
  ) {}

  async plan(file: Buffer): Promise<ImportPlan> {
    const sheet = await this.reader.read(file, DATA_SHEET);
    const extracted = extractImportRows(sheet.rows);
    if (extracted.fileErrors.length > 0) return { ...extracted, rows: [] };

    const [existing, categories, costCenters, equipment, pricing, nextSequence] = await Promise.all(
      [
        this.products.findByCodes(codesIn(extracted.rows)),
        this.categories.findAllWithCounts(),
        this.costCenters.findAllWithCounts(),
        this.equipment.findAllWithCounts(),
        this.pricingSettings.execute(),
        this.products.nextInternalSequence(),
      ],
    );

    const rows = planProductImport(
      extracted.rows,
      new Map(existing.map((product) => [product.code, product])),
      buildLookups(categories, costCenters, equipment, pricing.igvRate),
      nextSequence,
    );
    return { fileErrors: [], fileWarnings: extracted.fileWarnings, rows };
  }
}

@Injectable()
export class PreviewProductImport {
  constructor(private readonly planner: ProductImportPlanner) {}

  async execute(file: Buffer): Promise<ProductImportPreview> {
    const { fileErrors, fileWarnings, rows } = await this.planner.plan(file);
    return {
      fileErrors,
      fileWarnings,
      summary: {
        totalRows: rows.length,
        toCreate: rows.filter((row) => row.errors.length === 0 && row.action === 'CREATE').length,
        toUpdate: rows.filter((row) => row.errors.length === 0 && row.action === 'UPDATE').length,
        withErrors: rows.filter((row) => row.errors.length > 0).length,
        withWarnings: rows.filter((row) => row.warnings.length > 0).length,
      },
      rows: rows.map(({ rowNumber, action, code, name, errors, warnings }) => ({
        rowNumber,
        action,
        code,
        name,
        errors,
        warnings,
      })),
    };
  }
}

/** All-or-nothing: nothing is written unless every row is valid. */
@Injectable()
export class ImportProducts {
  constructor(
    private readonly planner: ProductImportPlanner,
    private readonly products: ProductRepository,
    private readonly ledger: StockLedger,
    private readonly uow: UnitOfWork,
  ) {}

  execute(file: Buffer, userId: number): Promise<ProductImportResult> {
    return this.uow.run(async () => {
      const plan = await this.planner.plan(file);
      const invalidRows = plan.rows.filter((row) => row.errors.length > 0).length;
      if (plan.fileErrors.length > 0 || invalidRows > 0) {
        throw new BusinessRuleError(
          'PRODUCT_IMPORT_HAS_ERRORS',
          'The file has errors; nothing was imported',
          { fileErrors: plan.fileErrors, invalidRows },
        );
      }
      if (plan.rows.length === 0) {
        throw new BusinessRuleError('PRODUCT_IMPORT_EMPTY', 'The file has no product rows');
      }

      const result: ProductImportResult = { created: 0, updated: 0, initialStockMovements: 0 };
      for (const row of plan.rows) {
        if (row.create) {
          const product = await this.products.create(row.create.draft, row.create.equipmentIds);
          result.created += 1;
          if (row.create.initialStock > 0) {
            await this.ledger.apply({
              productId: product.id,
              type: 'IN',
              reason: 'INITIAL_LOAD',
              delta: row.create.initialStock,
              note: 'Carga inicial (importación desde Excel)',
              userId,
            });
            result.initialStockMovements += 1;
          }
        } else if (row.update) {
          await this.products.update(
            row.update.productId,
            row.update.changes,
            row.update.equipmentIds,
          );
          result.updated += 1;
        }
      }
      return result;
    });
  }
}

const REQUIRED_LABEL: Record<ImportColumn['required'], string> = {
  always: 'Sí',
  new: 'Solo en productos nuevos',
  no: 'No',
};

const GENERAL_RULES = [
  'Una fila por producto. No cambies los nombres de las columnas ni la hoja "Productos".',
  'Si el código ya existe, la fila ACTUALIZA ese producto. Las celdas vacías no modifican nada.',
  'Si el código no existe o está vacío, se CREA un producto nuevo.',
  'Todos los montos están en soles (S/). El costo va SIN IGV; los precios de venta van CON IGV.',
  'Antes de guardar verás una vista previa con los errores de cada fila. No se importa nada hasta que confirmes, y si hay errores no se importa nada.',
  `Máximo ${MAX_IMPORT_ROWS} filas por archivo.`,
];

@Injectable()
export class DownloadProductImportTemplate {
  constructor(
    private readonly writer: SpreadsheetWriter,
    private readonly categories: CategoryRepository,
    private readonly costCenters: CostCenterRepository,
  ) {}

  async execute(): Promise<Buffer> {
    const [categories, costCenters] = await Promise.all([
      this.categories.findAllWithCounts(),
      this.costCenters.findAllWithCounts(),
    ]);

    const labels = categoryLabels(categories);
    const bySortOrder = (
      a: { sortOrder: number; name: string },
      b: { sortOrder: number; name: string },
    ) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es');
    const roots = categories.filter((category) => category.parentId === null).sort(bySortOrder);
    const categoryValues = roots.flatMap((root) => [
      labels.get(root.id) as string,
      ...categories
        .filter((category) => category.parentId === root.id)
        .sort(bySortOrder)
        .map((child) => labels.get(child.id) as string),
    ]);

    const moneyKeys = new Set(['costPen', 'priceWithIgvPen', 'wholesaleWithIgvPen']);
    const integerKeys = new Set(['initialStock', 'minStock', 'reorderQuantity', 'wholesaleMinQty']);

    return this.writer.writeWorkbook([
      {
        name: DATA_SHEET,
        columns: IMPORT_COLUMNS.map((column) => ({
          header: column.header,
          key: column.key,
          width: column.width,
          numFmt:
            column.key === 'code'
              ? '@'
              : moneyKeys.has(column.key)
                ? '#,##0.00'
                : integerKeys.has(column.key)
                  ? '0'
                  : undefined,
        })),
        rows: [],
        headerNotes: Object.fromEntries(IMPORT_COLUMNS.map((column) => [column.key, column.help])),
        dropdowns: [
          { key: 'category', values: categoryValues },
          {
            key: 'costCenter',
            values: costCenters
              .map((center) => center.name)
              .sort((a, b) => a.localeCompare(b, 'es')),
          },
          { key: 'unit', values: Object.values(UNIT_TEMPLATE_LABELS) },
          { key: 'consignment', values: ['Sí', 'No'] },
        ],
      },
      {
        name: 'Instrucciones',
        columns: [
          { header: 'Columna', key: 'column', width: 30, wrap: true },
          { header: 'Obligatoria', key: 'required', width: 24, wrap: true },
          { header: 'Cómo llenarla', key: 'help', width: 90, wrap: true },
          { header: 'Ejemplo', key: 'example', width: 36, wrap: true },
        ],
        rows: [
          ...GENERAL_RULES.map((rule) => ({
            column: 'Importante',
            required: '',
            help: rule,
            example: '',
          })),
          ...IMPORT_COLUMNS.map((column) => ({
            column: column.header,
            required: REQUIRED_LABEL[column.required],
            help: column.help,
            example: column.example,
          })),
        ],
      },
    ]);
  }
}
