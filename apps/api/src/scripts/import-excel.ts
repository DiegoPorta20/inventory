import { existsSync } from 'node:fs';
import path from 'node:path';
import { count, eq, inArray } from 'drizzle-orm';
import type { Database } from '../shared/infrastructure/database/database.service.js';
import {
  importOrderItems,
  importOrders,
  productEquipment,
  products,
  stockCountItems,
  stockCounts,
  stockMovements,
} from '../shared/infrastructure/database/schema.js';
import { readInventorySheet } from './excel/inventory-sheet.reader.js';
import { planImport, type ImportPlan } from './excel/plan-import.js';
import { openScriptContext } from './script-context.js';
import { ensureEquipment, ensureTaxonomy } from './seed-data.js';

const CHUNK = 200;
const DEFAULT_SNAPSHOT = '2026-09-30';
const MIGRATION_NOTE = 'Migrated from Excel';

interface Options {
  file: string;
  reset: boolean;
  dryRun: boolean;
  snapshot: string;
  minStock: number;
}

function parseOptions(argv: string[]): Options {
  const flags = argv.filter((arg) => arg.startsWith('--'));
  const positional = argv.find((arg) => !arg.startsWith('--'));
  const flag = (name: string) => flags.find((f) => f.startsWith(`--${name}=`))?.split('=')[1];

  const candidates = [positional, 'data/inventory.xlsx', '../../data/inventory.xlsx'].filter(
    Boolean,
  ) as string[];
  const file = candidates.map((p) => path.resolve(process.cwd(), p)).find((p) => existsSync(p));
  if (!file)
    throw new Error(
      `Spreadsheet not found. Pass the path as the first argument (tried: ${candidates.join(', ')})`,
    );

  return {
    file,
    reset: flags.includes('--reset'),
    dryRun: flags.includes('--dry-run'),
    snapshot: flag('snapshot') ?? DEFAULT_SNAPSHOT,
    minStock: Number(flag('min-stock') ?? 0),
  };
}

function* chunked<T>(items: T[], size = CHUNK): Generator<T[]> {
  for (let start = 0; start < items.length; start += size) yield items.slice(start, start + size);
}

/** Deletes only this company's inventory; child tables are reached through their parents. */
async function clearInventory(db: Database, companyId: number): Promise<void> {
  const countIds = db
    .select({ id: stockCounts.id })
    .from(stockCounts)
    .where(eq(stockCounts.companyId, companyId));
  const importIds = db
    .select({ id: importOrders.id })
    .from(importOrders)
    .where(eq(importOrders.companyId, companyId));
  const productIds = db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.companyId, companyId));

  await db.delete(stockCountItems).where(inArray(stockCountItems.stockCountId, countIds));
  await db.delete(stockCounts).where(eq(stockCounts.companyId, companyId));
  await db.delete(stockMovements).where(eq(stockMovements.companyId, companyId));
  await db.delete(importOrderItems).where(inArray(importOrderItems.importOrderId, importIds));
  await db.delete(importOrders).where(eq(importOrders.companyId, companyId));
  await db.delete(productEquipment).where(inArray(productEquipment.productId, productIds));
  await db.delete(products).where(eq(products.companyId, companyId));
}

async function applyPlan(
  db: Database,
  companyId: number,
  plan: ImportPlan,
  options: Options,
): Promise<void> {
  const categoryIds = await ensureTaxonomy(db, companyId);
  const equipmentIds = await ensureEquipment(db, companyId);

  const [existing] = await db
    .select({ value: count() })
    .from(products)
    .where(eq(products.companyId, companyId));
  if (Number(existing?.value ?? 0) > 0) {
    if (!options.reset)
      throw new Error('Products already exist. Re-run with --reset to replace inventory data.');
    await clearInventory(db, companyId);
  }

  for (const batch of chunked(plan.products)) {
    await db.insert(products).values(
      batch.map((product) => ({
        companyId,
        code: product.code,
        isInternalCode: product.isInternalCode,
        name: product.name,
        unit: product.unit,
        categoryId: categoryIds.get(product.categorySlug) ?? null,
        stock: product.received - product.sold,
        minStock: options.minStock,
        notes: product.notes ? `Excel: ${product.notes}` : null,
      })),
    );
  }
  const productRows = await db
    .select({ id: products.id, code: products.code })
    .from(products)
    .where(eq(products.companyId, companyId));
  const productId = new Map(productRows.map((row) => [row.code, row.id]));

  const links = plan.products.flatMap((product) =>
    product.equipmentNames.map((name) => ({
      productId: productId.get(product.code) as number,
      equipmentId: equipmentIds.get(name) as number,
    })),
  );
  for (const batch of chunked(links)) await db.insert(productEquipment).values(batch);

  const importId = new Map<number, number>();
  for (const order of plan.imports) {
    const [result] = await db.insert(importOrders).values({
      companyId,
      number: order.number,
      status: 'RECEIVED',
      receivedAt: options.snapshot,
      notes: MIGRATION_NOTE,
    });
    importId.set(order.number, result.insertId);
    await db.insert(importOrderItems).values(
      order.lines.map((line) => ({
        importOrderId: result.insertId,
        productId: productId.get(line.productCode) as number,
        quantityOrdered: line.quantity,
        quantityReceived: line.quantity,
      })),
    );
  }

  const occurredAt = new Date(`${options.snapshot}T12:00:00.000-05:00`);
  const running = new Map<string, number>();
  const movements: (typeof stockMovements.$inferInsert)[] = [];
  const push = (
    code: string,
    entry: Omit<
      typeof stockMovements.$inferInsert,
      'companyId' | 'productId' | 'stockAfter' | 'occurredAt'
    >,
  ) => {
    const stockAfter = (running.get(code) ?? 0) + entry.quantity;
    running.set(code, stockAfter);
    movements.push({
      ...entry,
      companyId,
      productId: productId.get(code) as number,
      stockAfter,
      occurredAt,
    });
  };

  for (const order of plan.imports) {
    for (const line of order.lines) {
      push(line.productCode, {
        type: 'IN',
        reason: 'IMPORT_RECEIPT',
        quantity: line.quantity,
        referenceType: 'IMPORT_ORDER',
        referenceId: importId.get(order.number),
        note: `Import #${order.number} - ${MIGRATION_NOTE}`,
      });
    }
  }
  for (const line of plan.unassignedReceipts) {
    push(line.productCode, {
      type: 'IN',
      reason: 'INITIAL_LOAD',
      quantity: line.quantity,
      note: MIGRATION_NOTE,
    });
  }
  for (const product of plan.products.filter((p) => p.sold > 0)) {
    push(product.code, {
      type: 'OUT',
      reason: 'SALE',
      quantity: -product.sold,
      note: `Historical sales until ${options.snapshot} - ${MIGRATION_NOTE}`,
    });
  }
  for (const batch of chunked(movements)) await db.insert(stockMovements).values(batch);
}

function report(plan: ImportPlan): void {
  const byCategory = new Map<string, number>();
  for (const product of plan.products)
    byCategory.set(product.categorySlug, (byCategory.get(product.categorySlug) ?? 0) + 1);

  console.log(
    `Products: ${plan.products.length} (${plan.products.filter((p) => p.isInternalCode).length} with internal code)`,
  );
  console.log(
    `Imports: ${plan.imports.length} (${plan.imports.reduce((sum, i) => sum + i.lines.length, 0)} lines)`,
  );
  console.log(`Units in stock: ${plan.products.reduce((sum, p) => sum + p.received - p.sold, 0)}`);
  console.log('Products per category:');
  for (const [slug, total] of [...byCategory.entries()].sort((a, b) => b[1] - a[1]))
    console.log(`  ${slug.padEnd(20)} ${total}`);

  const unclassified = plan.products.filter((p) => p.categorySlug === 'uncategorized');
  if (unclassified.length > 0) {
    console.log('Unclassified (extend classifier.ts rules):');
    for (const product of unclassified) console.log(`  ${product.code}  ${product.name}`);
  }
  for (const warning of plan.warnings) console.warn(`warning: ${warning}`);
}

const options = parseOptions(process.argv.slice(2));
const plan = planImport(await readInventorySheet(options.file));
report(plan);

if (options.dryRun) {
  console.log('Dry run: nothing was written');
} else {
  const { db, company, close } = openScriptContext();
  try {
    console.log(`Importing into company: ${company.id}`);
    await db.transaction((tx) => applyPlan(tx as unknown as Database, company.id, plan, options));
    console.log('Import completed');
  } finally {
    await close();
  }
}
