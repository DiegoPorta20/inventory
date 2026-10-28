import { classify, searchable } from './classifier.js';
import { detectEquipment } from './equipment-links.js';
import { normalizeCode, normalizeDescription } from './normalize.js';
import type { PriceRow } from './price-sheet.reader.js';

export interface InventoryProductRef {
  id: number;
  code: string;
  name: string;
}

export interface PriceUpdate {
  productId: number;
  code: string;
  priceUsd: number | null;
  priceVariants: number;
  wholesalePriceUsd: number | null;
  wholesaleMinQty: number | null;
  specification: string | null;
  costCenter: string | null;
  isConsignment: boolean;
  equipmentNames: string[];
}

export interface MissingProduct {
  row: PriceRow;
  code: string | null;
  name: string;
  categorySlug: string;
}

export interface PricePlan {
  updates: PriceUpdate[];
  missing: MissingProduct[];
  productsWithoutPrice: number;
}

const COST_CENTER_NAMES: Record<string, string> = {
  minidumper: 'Minidumper',
  'repuesto minidumper': 'Repuesto Minidumper',
  'acero sds max': 'Aceros SDS Max',
  'barrenos conicos': 'Barrenos cónicos',
  'brocas de botones': 'Brocas de botones',
  'repuesto jumbo': 'Repuesto Jumbo',
};

const CJK = /[\u2e80-\u9fff\uff00-\uffef]/g;

export function normalizeCostCenter(raw: string | null): string | null {
  const text = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return COST_CENTER_NAMES[searchable(text)] ?? text.charAt(0).toUpperCase() + text.slice(1);
}

/** Keeps the Spanish part of bilingual specifications and drops generic placeholders. */
export function cleanSpecification(
  raw: string | null,
  costCenter: string | null = null,
): string | null {
  if (!raw || raw.startsWith('F:')) return null;
  const text = raw
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(CJK, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\(\s*\)/g, '')
    .replace(/^[/\s]+|[/\s]+$/g, '')
    .trim();
  const lower = searchable(text);
  if (text === '' || lower === 'repuesto' || lower === searchable(costCenter ?? '')) return null;
  return text.slice(0, 500);
}

/** Source codes contain typos such as the letters O or D instead of zero. */
function lookupCodes(code: string): string[] {
  const alias = /^[0-9Z]/.test(code) ? code.replace(/[OD]/g, '0') : code;
  return alias === code ? [code] : [code, alias];
}

const sectionEquipment = (section: string): string[] => {
  const text = searchable(section);
  const names: string[] = [];
  if (text.includes('jumbo')) names.push('Jumbo DK0138');
  if (text.includes('yuchai')) names.push('Motor Yuchai');
  return names;
};

const roundPrice = (value: number): number => Math.round(value * 10_000) / 10_000;

export function planPrices(
  rows: PriceRow[],
  inventory: InventoryProductRef[],
  igvRate: number,
): PricePlan {
  const byCode = new Map(inventory.map((product) => [product.code, product]));
  const byName = new Map<string, InventoryProductRef[]>();
  for (const product of inventory) {
    const key = searchable(product.name);
    byName.set(key, [...(byName.get(key) ?? []), product]);
  }

  const grouped = new Map<number, { product: InventoryProductRef; rows: PriceRow[] }>();
  const missing: MissingProduct[] = [];

  for (const row of rows) {
    const code = normalizeCode(row.code);
    const name = normalizeDescription(row.description);
    const product = matchProduct(code, name);
    if (product) {
      const entry = grouped.get(product.id) ?? { product, rows: [] };
      entry.rows.push(row);
      grouped.set(product.id, entry);
    } else {
      missing.push({ row, code, name, categorySlug: classify(name) });
    }
  }

  const updates = [...grouped.values()].map(({ product, rows: productRows }) =>
    buildUpdate(product, productRows, igvRate),
  );
  return {
    updates,
    missing,
    productsWithoutPrice:
      inventory.length - updates.filter((update) => update.priceUsd !== null).length,
  };

  function matchProduct(code: string | null, name: string): InventoryProductRef | undefined {
    if (code) {
      for (const candidate of lookupCodes(code)) {
        const hit = byCode.get(candidate);
        if (hit) return hit;
      }
      return undefined;
    }
    const candidates = byName.get(searchable(name));
    return candidates?.length === 1 ? candidates[0] : undefined;
  }
}

function buildUpdate(product: InventoryProductRef, rows: PriceRow[], igvRate: number): PriceUpdate {
  const priced = rows.filter((row) => row.priceUsd !== null);
  const weight = (row: PriceRow) => Math.max(row.totalQuantity ?? 1, 1);
  const totalWeight = priced.reduce((sum, row) => sum + weight(row), 0);
  const priceUsd =
    priced.length === 0
      ? null
      : roundPrice(
          priced.reduce((sum, row) => sum + (row.priceUsd as number) * weight(row), 0) /
            totalWeight,
        );

  const wholesale = rows.find(
    (row) => row.wholesaleUsdWithIgv !== null && row.wholesaleMinQty !== null,
  );
  const costCenter = mostCommon(rows.map((row) => normalizeCostCenter(row.costCenter)));
  const consignmentRows = rows.filter((row) => /consignaci/i.test(row.section));

  return {
    productId: product.id,
    code: product.code,
    priceUsd,
    priceVariants: new Set(priced.map((row) => Math.round((row.priceUsd as number) * 100))).size,
    wholesalePriceUsd: wholesale
      ? roundPrice((wholesale.wholesaleUsdWithIgv as number) / (1 + igvRate))
      : null,
    wholesaleMinQty: wholesale ? (wholesale.wholesaleMinQty as number) : null,
    specification:
      rows.map((row) => cleanSpecification(row.specification, row.costCenter)).find(Boolean) ??
      null,
    costCenter,
    isConsignment: consignmentRows.length > 0 && consignmentRows.length === rows.length,
    equipmentNames: [
      ...new Set(
        rows.flatMap((row) => [
          ...sectionEquipment(row.section),
          ...detectEquipment(row.description),
        ]),
      ),
    ],
  };
}

function mostCommon(values: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const value of values) if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
