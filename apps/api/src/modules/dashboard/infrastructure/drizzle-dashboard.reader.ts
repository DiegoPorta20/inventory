import { Injectable } from '@nestjs/common';
import { and, desc, eq, gt, gte, lt, sql } from 'drizzle-orm';
import { DatabaseService } from '../../../shared/infrastructure/database/database.service.js';
import {
  categories,
  importOrderItems,
  importOrders,
  products,
  stockMovements,
  users,
} from '../../../shared/infrastructure/database/schema.js';
import {
  DashboardReader,
  type CategoryStock,
  type DailyMovement,
  type InventoryTotals,
  type RecentMovement,
  type TopSoldProduct,
} from '../application/ports/dashboard.reader.js';

const number = <T extends ReturnType<typeof sql>>(expression: T) => expression.mapWith(Number);
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DrizzleDashboardReader extends DashboardReader {
  constructor(private readonly database: DatabaseService) {
    super();
  }

  async totals(): Promise<InventoryTotals> {
    const [stock] = await this.database.db
      .select({
        activeProducts: number(sql`COUNT(*)`),
        totalUnits: number(sql`COALESCE(SUM(${products.stock}), 0)`),
        inventoryValueUsd: number(sql`COALESCE(SUM(${products.stock} * ${products.costUsd}), 0)`),
        inventoryValueAtPriceUsd: number(
          sql`COALESCE(SUM(${products.stock} * ${products.priceUsd}), 0)`,
        ),
        withoutPrice: number(sql`COALESCE(SUM(${products.priceUsd} IS NULL), 0)`),
        consignmentUnits: number(
          sql`COALESCE(SUM(CASE WHEN ${products.isConsignment} THEN ${products.stock} ELSE 0 END), 0)`,
        ),
        outOfStock: number(sql`COALESCE(SUM(${products.stock} = 0), 0)`),
        lowStock: number(
          sql`COALESCE(SUM(${products.stock} > 0 AND ${products.minStock} > 0 AND ${products.stock} <= ${products.minStock}), 0)`,
        ),
        unconfiguredMinStock: number(
          sql`COALESCE(SUM(${products.stock} > 0 AND ${products.minStock} = 0), 0)`,
        ),
      })
      .from(products)
      .where(eq(products.isActive, true));

    const [incoming] = await this.database.db
      .select({
        units: number(
          sql`COALESCE(SUM(${importOrderItems.quantityOrdered} - ${importOrderItems.quantityReceived}), 0)`,
        ),
        orders: number(sql`COUNT(DISTINCT ${importOrders.id})`),
      })
      .from(importOrderItems)
      .innerJoin(importOrders, eq(importOrders.id, importOrderItems.importOrderId))
      .where(sql`${importOrders.status} IN ('ORDERED', 'IN_TRANSIT')`);

    return {
      activeProducts: stock?.activeProducts ?? 0,
      totalUnits: stock?.totalUnits ?? 0,
      inventoryValueUsd: stock?.inventoryValueUsd ?? 0,
      inventoryValueAtPriceUsd: stock?.inventoryValueAtPriceUsd ?? 0,
      withoutPrice: stock?.withoutPrice ?? 0,
      consignmentUnits: stock?.consignmentUnits ?? 0,
      outOfStock: stock?.outOfStock ?? 0,
      lowStock: stock?.lowStock ?? 0,
      unconfiguredMinStock: stock?.unconfiguredMinStock ?? 0,
      incomingUnits: incoming?.units ?? 0,
      openImports: incoming?.orders ?? 0,
    };
  }

  async stockByCategory(): Promise<CategoryStock[]> {
    const [rows, allCategories] = await Promise.all([
      this.database.db
        .select({
          categoryId: products.categoryId,
          products: number(sql`COUNT(*)`),
          units: number(sql`COALESCE(SUM(${products.stock}), 0)`),
          valueUsd: number(sql`COALESCE(SUM(${products.stock} * ${products.costUsd}), 0)`),
        })
        .from(products)
        .where(eq(products.isActive, true))
        .groupBy(products.categoryId),
      this.database.db
        .select({ id: categories.id, name: categories.name, parentId: categories.parentId })
        .from(categories),
    ]);

    const byId = new Map(allCategories.map((category) => [category.id, category]));
    const rolled = new Map<number | null, CategoryStock>();
    for (const row of rows) {
      const category = row.categoryId ? byId.get(row.categoryId) : undefined;
      const rootId = category ? (category.parentId ?? category.id) : null;
      const rootName = rootId ? (byId.get(rootId)?.name ?? 'Sin categoría') : 'Sin categoría';
      const current = rolled.get(rootId) ?? {
        categoryId: rootId,
        name: rootName,
        products: 0,
        units: 0,
        valueUsd: 0,
      };
      current.products += row.products;
      current.units += row.units;
      current.valueUsd += row.valueUsd;
      rolled.set(rootId, current);
    }
    return [...rolled.values()].sort((a, b) => b.units - a.units);
  }

  async dailyMovements(days: number): Promise<DailyMovement[]> {
    const since = new Date(Date.now() - days * DAY_MS);
    const day = sql<string>`DATE_FORMAT(${stockMovements.occurredAt} - INTERVAL 5 HOUR, '%Y-%m-%d')`;
    const rows = await this.database.db
      .select({
        date: day,
        inQty: number(
          sql`COALESCE(SUM(CASE WHEN ${stockMovements.quantity} > 0 THEN ${stockMovements.quantity} ELSE 0 END), 0)`,
        ),
        outQty: number(
          sql`COALESCE(SUM(CASE WHEN ${stockMovements.quantity} < 0 THEN -${stockMovements.quantity} ELSE 0 END), 0)`,
        ),
      })
      .from(stockMovements)
      .where(gte(stockMovements.occurredAt, since))
      .groupBy(day)
      .orderBy(day);
    return rows;
  }

  topSold(days: number, limit: number): Promise<TopSoldProduct[]> {
    const since = new Date(Date.now() - days * DAY_MS);
    const quantity = number(sql`SUM(-${stockMovements.quantity})`);
    return this.database.db
      .select({
        productId: products.id,
        code: products.code,
        name: products.name,
        quantity,
      })
      .from(stockMovements)
      .innerJoin(products, eq(products.id, stockMovements.productId))
      .where(
        and(
          eq(stockMovements.reason, 'SALE'),
          gte(stockMovements.occurredAt, since),
          lt(stockMovements.quantity, 0),
        ),
      )
      .groupBy(products.id)
      .having(gt(quantity, 0))
      .orderBy(desc(quantity))
      .limit(limit);
  }

  recentMovements(limit: number): Promise<RecentMovement[]> {
    return this.database.db
      .select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        productCode: products.code,
        productName: products.name,
        type: stockMovements.type,
        reason: stockMovements.reason,
        quantity: stockMovements.quantity,
        occurredAt: stockMovements.occurredAt,
        userName: users.name,
      })
      .from(stockMovements)
      .innerJoin(products, eq(products.id, stockMovements.productId))
      .leftJoin(users, eq(users.id, stockMovements.userId))
      .orderBy(desc(stockMovements.occurredAt), desc(stockMovements.id))
      .limit(limit);
  }
}
