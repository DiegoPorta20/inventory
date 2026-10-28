import type { UnitOfMeasure } from '../../modules/products/domain/product.js';
import { formatInternalCode } from '../../modules/products/domain/product.js';
import { classify } from './classifier.js';
import { detectEquipment } from './equipment-links.js';
import type { RawRow } from './inventory-sheet.reader.js';
import { normalizeCode, normalizeDescription, normalizeUnit } from './normalize.js';

export interface PlannedProduct {
  code: string;
  isInternalCode: boolean;
  name: string;
  unit: UnitOfMeasure;
  categorySlug: string;
  notes: string | null;
  equipmentNames: string[];
  received: number;
  sold: number;
}

export interface PlannedImport {
  number: number;
  lines: { productCode: string; quantity: number }[];
}

export interface ImportPlan {
  products: PlannedProduct[];
  imports: PlannedImport[];
  unassignedReceipts: { productCode: string; quantity: number }[];
  warnings: string[];
}

export function planImport(rows: RawRow[]): ImportPlan {
  const warnings: string[] = [];
  const products = new Map<string, PlannedProduct>();
  const imports = new Map<number, Map<string, number>>();
  const unassigned = new Map<string, number>();
  const internalCodes = new Map<string, string>();

  for (const row of rows) {
    const name = normalizeDescription(row.description);
    const sourceCode = normalizeCode(row.code);
    const code = sourceCode ?? internalCodeFor(internalCodes, name);

    const existing = products.get(code);
    if (existing) {
      existing.received += row.received;
      existing.sold += row.sold;
      existing.notes = mergeNotes(existing.notes, row.notes);
    } else {
      products.set(code, {
        code,
        isInternalCode: sourceCode === null,
        name,
        unit: normalizeUnit(row.unit),
        categorySlug: classify(name),
        notes: row.notes,
        equipmentNames: detectEquipment(name),
        received: row.received,
        sold: row.sold,
      });
    }

    if (row.received > 0) {
      if (row.importNumber === null) {
        unassigned.set(code, (unassigned.get(code) ?? 0) + row.received);
        warnings.push(`Row ${row.rowNumber}: no import number, loaded as initial stock`);
      } else {
        const lines = imports.get(row.importNumber) ?? new Map<string, number>();
        lines.set(code, (lines.get(code) ?? 0) + row.received);
        imports.set(row.importNumber, lines);
      }
    }
  }

  for (const product of products.values()) {
    if (product.sold > product.received) {
      warnings.push(
        `${product.code}: sold (${product.sold}) exceeds received (${product.received}); sales clamped`,
      );
      product.sold = product.received;
    }
  }

  return {
    products: [...products.values()],
    imports: [...imports.entries()]
      .sort(([a], [b]) => a - b)
      .map(([number, lines]) => ({
        number,
        lines: [...lines.entries()].map(([productCode, quantity]) => ({ productCode, quantity })),
      })),
    unassignedReceipts: [...unassigned.entries()].map(([productCode, quantity]) => ({
      productCode,
      quantity,
    })),
    warnings,
  };
}

function mergeNotes(current: string | null, incoming: string | null): string | null {
  if (!incoming || current === incoming) return current;
  return current ? `${current} | ${incoming}` : incoming;
}

function internalCodeFor(known: Map<string, string>, name: string): string {
  const key = name.toLowerCase();
  const existing = known.get(key);
  if (existing) return existing;
  const code = formatInternalCode(known.size + 1);
  known.set(key, code);
  return code;
}
