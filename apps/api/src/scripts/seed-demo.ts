import { and, eq, isNull, like, sql } from 'drizzle-orm';
import type { Database } from '../shared/infrastructure/database/database.service.js';
import {
  categories,
  costCenters,
  importOrderItems,
  importOrders,
  products,
  stockCountItems,
  stockCounts,
  stockMovements,
  suppliers,
  users,
} from '../shared/infrastructure/database/schema.js';
import { openScriptContext } from './script-context.js';

/**
 * Fills a development database with plausible random data (prices, costs, minimum stock,
 * locations, suppliers, imports in several states, recent sales and a physical count)
 * so every screen has something to show. Never run against production data.
 */

const DEMO_MARKER = 'DEMO';
const DAY_MS = 24 * 60 * 60 * 1000;
const LIMA_OFFSET_HOURS = 5;
const CHUNK = 200;

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20261028);
const between = (min: number, max: number) => min + random() * (max - min);
const integer = (min: number, max: number) => Math.floor(between(min, max + 1));
const pick = <T>(items: readonly T[]): T => items[integer(0, items.length - 1)] as T;
const round = (value: number, decimals = 4) => Math.round(value * 10 ** decimals) / 10 ** decimals;
const logUniform = (min: number, max: number) => Math.exp(between(Math.log(min), Math.log(max)));
const chance = (probability: number) => random() < probability;

const PRICE_RANGE_USD: Record<string, [number, number]> = {
  equipment: [1500, 9000],
  drilling: [15, 300],
  fasteners: [0.3, 4],
  sealing: [1, 18],
  hydraulics: [3, 120],
  filters: [8, 90],
  electrical: [6, 140],
  engine: [120, 1200],
  wheels: [30, 140],
  tools: [8, 160],
  'wire-ropes': [20, 200],
  bearings: [10, 120],
  'maintenance-kits': [200, 900],
  uncategorized: [3, 40],
};

const SUPPLIERS = [
  { name: 'Shandong Mining Machinery Co.', country: 'China', contactName: 'Li Wei' },
  { name: 'Yuchai Parts Ltd.', country: 'China', contactName: 'Zhang Min' },
  { name: 'Hebei Drill Tools Co.', country: 'China', contactName: 'Wang Fang' },
  { name: 'Weihai Hydraulics Group', country: 'China', contactName: 'Chen Hao' },
];

const CUSTOMERS = [
  'Minera Andina SAC',
  'Consorcio Huaraz',
  'Contratistas Mineros del Sur',
  'Inversiones Pasco EIRL',
  'Servicios Generales Cerro Verde',
  'Perforaciones del Centro SA',
];

const chunked = <T>(items: T[], size = CHUNK): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, i * size + size),
  );

const isoDate = (date: Date) =>
  new Date(date.getTime() - LIMA_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);

function randomTimeBetween(from: Date, to: Date): Date {
  const day = new Date(from.getTime() + random() * (to.getTime() - from.getTime()));
  day.setUTCHours(integer(9, 18) + LIMA_OFFSET_HOURS, integer(0, 59), 0, 0);
  return day > to ? to : day;
}

interface Row {
  id: number;
  name: string;
  stock: number;
  minStock: number;
  reorderQuantity: number;
  costUsd: number | null;
  priceUsd: number | null;
  wholesalePriceUsd: number | null;
  location: string | null;
  costCenterId: number | null;
  categoryId: number | null;
}

async function fillCommercialData(db: Database): Promise<Map<number, Row>> {
  const allCategories = await db.select().from(categories);
  const byId = new Map(allCategories.map((c) => [c.id, c]));
  const rootSlug = (categoryId: number | null): string => {
    const category = categoryId ? byId.get(categoryId) : undefined;
    const root = category?.parentId ? byId.get(category.parentId) : category;
    return root?.slug ?? 'uncategorized';
  };

  const centers = new Map((await db.select().from(costCenters)).map((c) => [c.name, c.id]));
  const centerId = async (name: string) => {
    const known = centers.get(name);
    if (known) return known;
    const [result] = await db.insert(costCenters).values({ name });
    centers.set(name, result.insertId);
    return result.insertId;
  };

  const rows = await db.select().from(products);
  const state = new Map<number, Row>();

  for (const product of rows) {
    const slug = rootSlug(product.categoryId);
    const [min, max] = PRICE_RANGE_USD[slug] ?? [3, 60];
    const changes: Partial<typeof products.$inferInsert> = {};
    let { costUsd, priceUsd } = product;

    if (priceUsd === null) {
      costUsd ??= round(logUniform(min, max));
      priceUsd = round(costUsd * between(1.3, 1.9));
      changes.priceUsd = priceUsd;
    } else if (costUsd === null) {
      costUsd = round(priceUsd / between(1.25, 1.7));
    }
    if (product.costUsd === null) changes.costUsd = costUsd;

    if (product.wholesalePriceUsd === null && chance(0.15)) {
      changes.wholesalePriceUsd = round(priceUsd * between(0.85, 0.93));
      changes.wholesaleMinQty = pick([6, 12, 24, 50]);
    }
    if (product.location === null && chance(0.85)) {
      changes.location = `${pick(['A', 'B', 'C', 'D', 'E'])}-${String(integer(1, 12)).padStart(2, '0')}-${integer(1, 4)}`;
    }
    if (product.costCenterId === null) {
      const isMinidumper = /minidumper|mindumper|wy ?(800|1000)/i.test(product.name);
      changes.costCenterId = await centerId(
        isMinidumper
          ? 'Repuesto Minidumper'
          : slug === 'drilling' && chance(0.3)
            ? 'Brocas de botones'
            : 'Repuesto Jumbo',
      );
    }

    let { minStock, reorderQuantity } = product;
    if (minStock === 0) {
      minStock =
        product.stock === 0
          ? integer(3, 8)
          : product.stock === 1
            ? Number(chance(0.15))
            : integer(1, Math.max(1, Math.floor(product.stock / 2)));
      if (product.stock > 1 && product.stock <= 25 && chance(0.1)) {
        minStock = product.stock + integer(0, 3);
      }
      changes.minStock = minStock;
    }
    if (reorderQuantity === 0) {
      reorderQuantity = integer(1, 8) * 5;
      changes.reorderQuantity = reorderQuantity;
    }

    if (Object.keys(changes).length > 0) {
      await db.update(products).set(changes).where(eq(products.id, product.id));
    }
    state.set(product.id, {
      id: product.id,
      name: product.name,
      stock: product.stock,
      minStock,
      reorderQuantity,
      costUsd,
      priceUsd,
      wholesalePriceUsd: changes.wholesalePriceUsd ?? product.wholesalePriceUsd,
      location: changes.location ?? product.location,
      costCenterId: changes.costCenterId ?? product.costCenterId,
      categoryId: product.categoryId,
    });
  }
  return state;
}

async function ensureSuppliers(db: Database): Promise<number[]> {
  const existing = await db.select({ id: suppliers.id }).from(suppliers);
  if (existing.length > 0) return existing.map((s) => s.id);
  const ids: number[] = [];
  for (const supplier of SUPPLIERS) {
    const [result] = await db.insert(suppliers).values({
      ...supplier,
      email: `ventas@${supplier.name.split(' ')[0]?.toLowerCase()}.example`,
    });
    ids.push(result.insertId);
  }
  return ids;
}

interface MovementEvent {
  productId: number;
  at: Date;
  type: 'IN' | 'OUT';
  reason: 'SALE' | 'CUSTOMER_RETURN' | 'DAMAGE' | 'IMPORT_RECEIPT';
  quantity: number;
  counterparty?: string;
  unitPriceUsd?: number | null;
  referenceId?: number;
  note?: string;
}

async function createImports(
  db: Database,
  state: Map<number, Row>,
  supplierIds: number[],
  now: Date,
): Promise<{
  receivedId: number;
  receivedLines: { productId: number; quantity: number }[];
  receivedAt: Date;
  number: number;
}> {
  const [last] = await db
    .select({ value: sql<number>`COALESCE(MAX(${importOrders.number}), 0)`.mapWith(Number) })
    .from(importOrders);
  let number = (last?.value ?? 0) + 1;

  const needing = [...state.values()].filter((p) => p.stock <= p.minStock);
  const spread = [...state.values()].filter((p) => p.stock > p.minStock);
  const lineFor = (product: Row) => ({
    productId: product.id,
    quantityOrdered: Math.max(product.reorderQuantity, product.minStock * 2 - product.stock, 1),
    unitCostUsd: product.costUsd,
  });
  const take = (source: Row[], count: number) => {
    const copy = [...source];
    return Array.from(
      { length: Math.min(count, copy.length) },
      () => copy.splice(integer(0, copy.length - 1), 1)[0] as Row,
    );
  };

  const plans = [
    {
      status: 'ORDERED',
      lines: take(needing, 8),
      orderedDaysAgo: 6,
      expectedInDays: 20,
      reference: 'PO-2026-DEMO-A',
    },
    {
      status: 'IN_TRANSIT',
      lines: take(needing, 6),
      orderedDaysAgo: 25,
      expectedInDays: 4,
      reference: 'PO-2026-DEMO-B',
    },
    {
      status: 'DRAFT',
      lines: take(needing, 4),
      orderedDaysAgo: null,
      expectedInDays: null,
      reference: 'PO-2026-DEMO-C',
    },
    {
      status: 'RECEIVED',
      lines: take(spread, 10),
      orderedDaysAgo: 40,
      expectedInDays: -14,
      reference: 'PO-2026-DEMO-D',
    },
  ] as const;

  let received: Awaited<ReturnType<typeof createImports>> | null = null;
  for (const plan of plans) {
    const orderedAt =
      plan.orderedDaysAgo === null
        ? null
        : isoDate(new Date(now.getTime() - plan.orderedDaysAgo * DAY_MS));
    const expectedAt =
      plan.expectedInDays === null
        ? null
        : isoDate(new Date(now.getTime() + plan.expectedInDays * DAY_MS));
    const isReceived = plan.status === 'RECEIVED';
    const [result] = await db.insert(importOrders).values({
      number,
      supplierId: pick(supplierIds),
      status: plan.status,
      reference: plan.reference,
      orderedAt,
      expectedAt,
      receivedAt: isReceived ? expectedAt : null,
      exchangeRate: 3.6,
      notes: `${DEMO_MARKER}: sample import for testing`,
    });
    const lines = plan.lines.map(lineFor);
    await db.insert(importOrderItems).values(
      lines.map((line) => ({
        importOrderId: result.insertId,
        productId: line.productId,
        quantityOrdered: line.quantityOrdered,
        quantityReceived: isReceived ? line.quantityOrdered : 0,
        unitCostUsd: line.unitCostUsd,
      })),
    );
    if (isReceived) {
      received = {
        receivedId: result.insertId,
        receivedLines: lines.map(({ productId, quantityOrdered }) => ({
          productId,
          quantity: quantityOrdered,
        })),
        receivedAt: randomTimeBetween(
          new Date(now.getTime() - 14 * DAY_MS),
          new Date(now.getTime() - 12 * DAY_MS),
        ),
        number,
      };
    }
    number += 1;
  }
  if (!received) throw new Error('Demo received import was not created');
  return received;
}

async function createMovements(
  db: Database,
  state: Map<number, Row>,
  received: Awaited<ReturnType<typeof createImports>>,
  adminId: number | null,
  now: Date,
): Promise<number> {
  const since = new Date('2026-10-01T00:00:00-05:00');
  const events: MovementEvent[] = received.receivedLines.map((line) => ({
    productId: line.productId,
    at: received.receivedAt,
    type: 'IN',
    reason: 'IMPORT_RECEIPT',
    quantity: line.quantity,
    referenceId: received.receivedId,
    note: `Import #${received.number}`,
  }));

  const sellable = [...state.values()].filter((p) => p.stock >= 2);
  for (const product of sellable.filter(() => chance(0.45))) {
    for (let i = integer(1, 3); i > 0; i--) {
      events.push({
        productId: product.id,
        at: randomTimeBetween(since, now),
        type: 'OUT',
        reason: 'SALE',
        quantity: integer(1, Math.max(1, Math.floor(product.stock / 3))),
        counterparty: pick(CUSTOMERS),
        unitPriceUsd: product.priceUsd,
      });
    }
  }
  for (const product of sellable.filter(() => chance(0.05))) {
    events.push({
      productId: product.id,
      at: randomTimeBetween(since, now),
      type: 'IN',
      reason: 'CUSTOMER_RETURN',
      quantity: 1,
      counterparty: pick(CUSTOMERS),
    });
  }
  for (const product of sellable.filter(() => chance(0.04))) {
    events.push({
      productId: product.id,
      at: randomTimeBetween(since, now),
      type: 'OUT',
      reason: 'DAMAGE',
      quantity: 1,
      note: 'Damaged during handling',
    });
  }

  events.sort((a, b) => a.at.getTime() - b.at.getTime());
  const running = new Map<number, number>();
  const rows: (typeof stockMovements.$inferInsert)[] = [];

  for (const event of events) {
    const current = running.get(event.productId) ?? state.get(event.productId)?.stock ?? 0;
    const delta = event.type === 'IN' ? event.quantity : -event.quantity;
    const minStock = state.get(event.productId)?.minStock ?? 0;
    if (
      event.type === 'OUT' &&
      current + delta <= Math.max(minStock, 0) &&
      (current + delta < 1 || !chance(0.1))
    ) {
      continue;
    }
    running.set(event.productId, current + delta);
    rows.push({
      productId: event.productId,
      type: event.type,
      reason: event.reason,
      quantity: delta,
      stockAfter: current + delta,
      unitPriceUsd: event.unitPriceUsd ?? null,
      counterparty: event.counterparty ?? null,
      referenceType: event.reason === 'IMPORT_RECEIPT' ? 'IMPORT_ORDER' : null,
      referenceId: event.referenceId ?? null,
      note: event.note ?? DEMO_MARKER,
      userId: adminId,
      occurredAt: event.at,
    });
  }
  for (const batch of chunked(rows)) await db.insert(stockMovements).values(batch);
  for (const [productId, stock] of running) {
    await db.update(products).set({ stock }).where(eq(products.id, productId));
    const row = state.get(productId);
    if (row) row.stock = stock;
  }
  return rows.length;
}

async function createStockCount(db: Database, adminId: number | null): Promise<number> {
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, 'filters'))
    .limit(1);
  if (!category) return 0;
  const items = await db
    .select({ id: products.id, stock: products.stock })
    .from(products)
    .where(and(eq(products.categoryId, category.id), eq(products.isActive, true)));
  if (items.length === 0) return 0;

  const [count] = await db.insert(stockCounts).values({
    name: 'Conteo de filtros (demo)',
    categoryId: category.id,
    note: DEMO_MARKER,
    createdBy: adminId,
  });
  await db.insert(stockCountItems).values(
    items.map((item, index) => ({
      stockCountId: count.insertId,
      productId: item.id,
      systemQty: item.stock,
      countedQty:
        index < items.length * 0.6
          ? Math.max(0, item.stock + (chance(0.25) ? integer(-2, 2) : 0))
          : null,
    })),
  );
  return items.length;
}

const { db, close } = openScriptContext();

try {
  if (process.env.NODE_ENV === 'production')
    throw new Error('seed-demo must not run in production');

  const [existingDemo] = await db
    .select({ id: importOrders.id })
    .from(importOrders)
    .where(like(importOrders.notes, `${DEMO_MARKER}%`))
    .limit(1);
  if (existingDemo) {
    throw new Error(
      'Demo data already present. Run `pnpm db:import-excel --reset` first to start from a clean inventory.',
    );
  }
  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
    .from(products);
  if (total === 0) throw new Error('No products found. Run `pnpm db:import-excel` first.');

  await db.transaction(async (transaction) => {
    const tx = transaction as unknown as Database;
    const now = new Date();
    const [admin] = await tx.select({ id: users.id }).from(users).limit(1);

    const state = await fillCommercialData(tx);
    const supplierIds = await ensureSuppliers(tx);
    const received = await createImports(tx, state, supplierIds, now);
    const movements = await createMovements(tx, state, received, admin?.id ?? null, now);
    const countItems = await createStockCount(tx, admin?.id ?? null);

    const withoutPrice = await tx
      .select({ id: products.id })
      .from(products)
      .where(isNull(products.priceUsd));
    console.log(
      `Products with commercial data: ${state.size} (without price: ${withoutPrice.length})`,
    );
    console.log(
      `Suppliers: ${supplierIds.length} · imports: 4 (ordered, in transit, draft, received)`,
    );
    console.log(`Stock movements created: ${movements}`);
    console.log(`Physical count items: ${countItems}`);
  });
  console.log('Demo data created');
} finally {
  await close();
}
