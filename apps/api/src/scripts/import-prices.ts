import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { formatInternalCode } from '../modules/products/domain/product.js';
import { DEFAULT_PRICING } from '../modules/settings/domain/pricing.js';
import type { Database } from '../shared/infrastructure/database/database.service.js';
import {
  costCenters,
  productEquipment,
  products,
  settings,
} from '../shared/infrastructure/database/schema.js';
import { normalizeUnit } from './excel/normalize.js';
import { planPrices, type MissingProduct, type PricePlan } from './excel/plan-prices.js';
import { readPriceSheet } from './excel/price-sheet.reader.js';
import { openScriptContext } from './script-context.js';
import { ensureEquipment, ensureTaxonomy } from './seed-data.js';

interface Options {
  file: string;
  dryRun: boolean;
  createMissing: boolean;
}

function parseOptions(argv: string[]): Options {
  const flags = argv.filter((arg) => arg.startsWith('--'));
  const positional = argv.find((arg) => !arg.startsWith('--'));
  const dataDirs = ['data', '../../data'].map((dir) => path.resolve(process.cwd(), dir));
  const discovered = dataDirs
    .filter((dir) => existsSync(dir))
    .flatMap((dir) => readdirSync(dir).map((name) => path.join(dir, name)))
    .find((file) => /precios.*\.xlsx$/i.test(path.basename(file)));
  const file = positional ? path.resolve(process.cwd(), positional) : discovered;
  if (!file || !existsSync(file)) {
    throw new Error(
      'Price list not found. Pass the path as the first argument or place it in data/.',
    );
  }
  return {
    file,
    dryRun: flags.includes('--dry-run'),
    createMissing: flags.includes('--create-missing'),
  };
}

async function readIgvRate(db: Database): Promise<number> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'pricing.igvRate'))
    .limit(1);
  return row ? Number(row.value) : DEFAULT_PRICING.igvRate;
}

async function applyPlan(db: Database, plan: PricePlan, options: Options): Promise<void> {
  const equipmentIds = await ensureEquipment(db);
  const categoryIds = await ensureTaxonomy(db);
  const costCenterIds = new Map(
    (await db.select({ id: costCenters.id, name: costCenters.name }).from(costCenters)).map(
      (row) => [row.name, row.id],
    ),
  );

  const costCenterId = async (name: string | null): Promise<number | null> => {
    if (!name) return null;
    const known = costCenterIds.get(name);
    if (known) return known;
    const [result] = await db.insert(costCenters).values({ name });
    costCenterIds.set(name, result.insertId);
    return result.insertId;
  };

  const linked = new Set(
    (await db.select().from(productEquipment)).map((row) => `${row.productId}:${row.equipmentId}`),
  );

  for (const update of plan.updates) {
    const changes: Partial<typeof products.$inferInsert> = { isConsignment: update.isConsignment };
    if (update.priceUsd !== null) changes.priceUsd = update.priceUsd;
    if (update.wholesalePriceUsd !== null) {
      changes.wholesalePriceUsd = update.wholesalePriceUsd;
      changes.wholesaleMinQty = update.wholesaleMinQty;
    }
    if (update.specification) changes.specification = update.specification;
    const centerId = await costCenterId(update.costCenter);
    if (centerId) changes.costCenterId = centerId;
    await db.update(products).set(changes).where(eq(products.id, update.productId));

    for (const name of update.equipmentNames) {
      const equipmentId = equipmentIds.get(name);
      const linkKey = `${update.productId}:${equipmentId}`;
      if (equipmentId && !linked.has(linkKey)) {
        await db.insert(productEquipment).values({ productId: update.productId, equipmentId });
        linked.add(linkKey);
      }
    }
  }

  if (!options.createMissing) return;

  const existingCodes = (await db.select({ code: products.code }).from(products)).map(
    (r) => r.code,
  );
  let internalSequence = existingCodes.filter((code) => code.startsWith('INT-')).length;

  const create = async ({ row, code, name, categorySlug }: MissingProduct): Promise<void> => {
    await db.insert(products).values({
      code: code ?? formatInternalCode(++internalSequence),
      isInternalCode: code === null,
      name,
      unit: normalizeUnit(row.unit),
      categoryId: categoryIds.get(categorySlug) ?? null,
      costCenterId: await costCenterId(row.costCenter),
      priceUsd: row.priceUsd,
      stock: 0,
      notes: 'Created from the price list (no stock history)',
    });
  };
  for (const item of plan.missing.filter(({ row }) => row.priceUsd !== null)) await create(item);
}

function report(plan: PricePlan, exchangeRate: number | null): void {
  const priced = plan.updates.filter((update) => update.priceUsd !== null);
  console.log(`Exchange rate in file: ${exchangeRate ?? 'n/a'}`);
  console.log(`Matched products: ${plan.updates.length} (${priced.length} with price)`);
  console.log(
    `Products with several different prices (weighted average used): ${plan.updates.filter((u) => u.priceVariants > 1).length}`,
  );
  console.log(
    `Wholesale prices: ${plan.updates.filter((u) => u.wholesalePriceUsd !== null).length}`,
  );
  console.log(`Consignment-only products: ${plan.updates.filter((u) => u.isConsignment).length}`);
  console.log(`Inventory products still without price: ${plan.productsWithoutPrice}`);
  if (plan.missing.length > 0) {
    console.log(`Rows without a matching product (${plan.missing.length}):`);
    for (const { row, code } of plan.missing) {
      console.log(
        `  row ${row.rowNumber}  ${code ?? '(no code)'}  ${row.description.slice(0, 70)}`,
      );
    }
  }
}

const options = parseOptions(process.argv.slice(2));
const sheet = await readPriceSheet(options.file);
const context = openScriptContext();

try {
  const igvRate = await readIgvRate(context.db);
  const inventory = await context.db
    .select({ id: products.id, code: products.code, name: products.name })
    .from(products);
  const plan = planPrices(sheet.rows, inventory, igvRate);
  report(plan, sheet.exchangeRate);

  if (options.dryRun) {
    console.log('Dry run: nothing was written');
  } else {
    await context.db.transaction((tx) => applyPlan(tx as unknown as Database, plan, options));
    console.log('Price import completed');
  }
} finally {
  await context.close();
}
