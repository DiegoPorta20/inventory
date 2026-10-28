import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  eq,
  inArray,
  isNotNull,
  isNull,
  like,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { offsetOf, toPage, type Page, type PageRequest } from '../../../shared/application/page.js';
import { BusinessRuleError } from '../../../shared/domain/errors.js';
import { DatabaseService } from '../../../shared/infrastructure/database/database.service.js';
import {
  categories,
  products,
  stockCountItems,
  stockCounts,
} from '../../../shared/infrastructure/database/schema.js';
import {
  StockCountRepository,
  type NewStockCount,
  type StockCountFilters,
  type StockCountItemFilters,
} from '../application/ports/stock-count.repository.js';
import {
  differenceOf,
  type StockCount,
  type StockCountItem,
  type StockCountStatus,
  type StockCountSummary,
} from '../domain/stock-count.js';

const INSERT_CHUNK = 500;
const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

const emptySummary: StockCountSummary = {
  itemsTotal: 0,
  itemsCounted: 0,
  itemsWithDifference: 0,
  netDifference: 0,
};

@Injectable()
export class DrizzleStockCountRepository extends StockCountRepository {
  constructor(private readonly database: DatabaseService) {
    super();
  }

  createWithSnapshot(input: NewStockCount): Promise<StockCount> {
    return this.database.transaction(async () => {
      const scope: SQL[] = [eq(products.isActive, true)];
      if (input.categoryId) {
        scope.push(
          sql`${products.categoryId} IN (SELECT ${categories.id} FROM ${categories} WHERE ${categories.id} = ${input.categoryId} OR ${categories.parentId} = ${input.categoryId})`,
        );
      }
      const snapshot = await this.database.db
        .select({ id: products.id, stock: products.stock })
        .from(products)
        .where(and(...scope));
      if (snapshot.length === 0) {
        throw new BusinessRuleError(
          'STOCK_COUNT_EMPTY_SCOPE',
          'There are no active products in the selected scope',
        );
      }

      const [result] = await this.database.db.insert(stockCounts).values({
        name: input.name,
        categoryId: input.categoryId,
        note: input.note,
        createdBy: input.createdBy,
      });
      const countId = result.insertId;

      for (let start = 0; start < snapshot.length; start += INSERT_CHUNK) {
        await this.database.db.insert(stockCountItems).values(
          snapshot.slice(start, start + INSERT_CHUNK).map((product) => ({
            stockCountId: countId,
            productId: product.id,
            systemQty: product.stock,
          })),
        );
      }
      const created = await this.findById(countId);
      if (!created) throw new Error('Stock count was not persisted');
      return created;
    });
  }

  async findById(id: number): Promise<StockCount | null> {
    const [row] = await this.countQuery().where(eq(stockCounts.id, id)).limit(1);
    return row ? this.toCount(row) : null;
  }

  async list(
    filters: StockCountFilters,
    page: PageRequest,
  ): Promise<Page<StockCount & { summary: StockCountSummary }>> {
    const conditions: SQL[] = [];
    if (filters.status) conditions.push(eq(stockCounts.status, filters.status));
    if (filters.categoryId) conditions.push(eq(stockCounts.categoryId, filters.categoryId));
    const where = and(...conditions);

    const rows = await this.countQuery()
      .where(where)
      .orderBy(sql`${stockCounts.createdAt} DESC`, sql`${stockCounts.id} DESC`)
      .limit(page.pageSize)
      .offset(offsetOf(page));
    const [totals] = await this.database.db
      .select({ value: count() })
      .from(stockCounts)
      .where(where);

    const summaries = await this.summaries(rows.map((row) => row.count.id));
    const items = rows.map((row) => ({
      ...this.toCount(row),
      summary: summaries.get(row.count.id) ?? emptySummary,
    }));
    return toPage(items, Number(totals?.value ?? 0), page);
  }

  async summaryOf(id: number): Promise<StockCountSummary> {
    return (await this.summaries([id])).get(id) ?? emptySummary;
  }

  async findItems(
    id: number,
    filters: StockCountItemFilters,
    page: PageRequest,
  ): Promise<Page<StockCountItem>> {
    const conditions: SQL[] = [eq(stockCountItems.stockCountId, id)];
    if (filters.onlyPending) conditions.push(isNull(stockCountItems.countedQty));
    if (filters.onlyDifferences) {
      conditions.push(
        isNotNull(stockCountItems.countedQty),
        ne(stockCountItems.countedQty, stockCountItems.systemQty),
      );
    }
    for (const word of (filters.search ?? '').split(/\s+/).filter(Boolean)) {
      const term = `%${escapeLike(word)}%`;
      const match = or(like(products.code, term), like(products.name, term));
      if (match) conditions.push(match);
    }
    const where = and(...conditions);

    const rows = await this.itemQuery()
      .where(where)
      .orderBy(asc(categories.name), asc(products.code))
      .limit(page.pageSize)
      .offset(offsetOf(page));
    const [totals] = await this.database.db
      .select({ value: count() })
      .from(stockCountItems)
      .innerJoin(products, eq(products.id, stockCountItems.productId))
      .where(where);
    return toPage(
      rows.map((row) => this.toItem(row)),
      Number(totals?.value ?? 0),
      page,
    );
  }

  async findCountedItems(id: number): Promise<StockCountItem[]> {
    const rows = await this.itemQuery().where(
      and(eq(stockCountItems.stockCountId, id), isNotNull(stockCountItems.countedQty)),
    );
    return rows.map((row) => this.toItem(row));
  }

  async updateItem(
    id: number,
    itemId: number,
    countedQty: number | null,
    note: string | null | undefined,
  ): Promise<StockCountItem | null> {
    const values: Partial<typeof stockCountItems.$inferInsert> = { countedQty };
    if (note !== undefined) values.note = note;
    await this.database.db
      .update(stockCountItems)
      .set(values)
      .where(and(eq(stockCountItems.id, itemId), eq(stockCountItems.stockCountId, id)));

    const [row] = await this.itemQuery()
      .where(and(eq(stockCountItems.id, itemId), eq(stockCountItems.stockCountId, id)))
      .limit(1);
    return row ? this.toItem(row) : null;
  }

  async confirmPendingItems(id: number): Promise<number> {
    const [result] = await this.database.db
      .update(stockCountItems)
      .set({ countedQty: sql`${stockCountItems.systemQty}` })
      .where(and(eq(stockCountItems.stockCountId, id), isNull(stockCountItems.countedQty)));
    return result.affectedRows;
  }

  async setStatus(id: number, status: StockCountStatus, completedAt?: Date): Promise<void> {
    await this.database.db
      .update(stockCounts)
      .set({ status, completedAt: completedAt ?? null })
      .where(eq(stockCounts.id, id));
  }

  private countQuery() {
    return this.database.db
      .select({ count: stockCounts, categoryName: categories.name })
      .from(stockCounts)
      .leftJoin(categories, eq(categories.id, stockCounts.categoryId))
      .$dynamic();
  }

  private itemQuery() {
    return this.database.db
      .select({
        item: stockCountItems,
        productCode: products.code,
        productName: products.name,
        unit: products.unit,
        categoryName: categories.name,
      })
      .from(stockCountItems)
      .innerJoin(products, eq(products.id, stockCountItems.productId))
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .$dynamic();
  }

  private toCount(row: {
    count: typeof stockCounts.$inferSelect;
    categoryName: string | null;
  }): StockCount {
    return {
      ...row.count,
      status: row.count.status as StockCountStatus,
      categoryName: row.categoryName,
    };
  }

  private toItem(row: {
    item: typeof stockCountItems.$inferSelect;
    productCode: string;
    productName: string;
    unit: string;
    categoryName: string | null;
  }): StockCountItem {
    return {
      id: row.item.id,
      stockCountId: row.item.stockCountId,
      productId: row.item.productId,
      productCode: row.productCode,
      productName: row.productName,
      unit: row.unit,
      categoryName: row.categoryName,
      systemQty: row.item.systemQty,
      countedQty: row.item.countedQty,
      difference: differenceOf(row.item.systemQty, row.item.countedQty),
      note: row.item.note,
    };
  }

  private async summaries(ids: number[]): Promise<Map<number, StockCountSummary>> {
    if (ids.length === 0) return new Map();
    const rows = await this.database.db
      .select({
        id: stockCountItems.stockCountId,
        total: count(),
        counted: sql<number>`SUM(${stockCountItems.countedQty} IS NOT NULL)`.mapWith(Number),
        differences:
          sql<number>`SUM(${stockCountItems.countedQty} IS NOT NULL AND ${stockCountItems.countedQty} <> ${stockCountItems.systemQty})`.mapWith(
            Number,
          ),
        net: sql<number>`COALESCE(SUM(${stockCountItems.countedQty} - ${stockCountItems.systemQty}), 0)`.mapWith(
          Number,
        ),
      })
      .from(stockCountItems)
      .where(inArray(stockCountItems.stockCountId, ids))
      .groupBy(stockCountItems.stockCountId);

    return new Map(
      rows.map((row) => [
        row.id,
        {
          itemsTotal: Number(row.total),
          itemsCounted: row.counted,
          itemsWithDifference: row.differences,
          netDifference: row.net,
        },
      ]),
    );
  }
}
