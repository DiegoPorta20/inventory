import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, exists, like, or, sql, type SQL } from 'drizzle-orm';
import { offsetOf, toPage, type Page, type PageRequest } from '../../../shared/application/page.js';
import { ConflictError, NotFoundError } from '../../../shared/domain/errors.js';
import { DatabaseService } from '../../../shared/infrastructure/database/database.service.js';
import { isDuplicateEntry } from '../../../shared/infrastructure/database/mysql-errors.js';
import {
  importOrderItems,
  importOrders,
  products,
  suppliers,
} from '../../../shared/infrastructure/database/schema.js';
import {
  ImportOrderRepository,
  type ImportItemDraft,
  type ImportOrderChanges,
  type ImportOrderDraft,
  type ImportOrderFilters,
  type ReceivedLine,
} from '../application/ports/import-order.repository.js';
import type {
  ImportOrder,
  ImportOrderDetail,
  ImportOrderItem,
  ImportOrderSummary,
  ImportStatus,
} from '../domain/import-order.js';

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

const itemAggregate = (expression: SQL) =>
  sql<number>`(SELECT COALESCE(${expression}, 0) FROM ${importOrderItems} WHERE ${importOrderItems.importOrderId} = ${importOrders.id})`.mapWith(
    Number,
  );

const summaryColumns = {
  order: importOrders,
  supplierName: suppliers.name,
  itemCount: itemAggregate(sql`COUNT(*)`),
  totalOrdered: itemAggregate(sql`SUM(${importOrderItems.quantityOrdered})`),
  totalReceived: itemAggregate(sql`SUM(${importOrderItems.quantityReceived})`),
  totalCostPen: itemAggregate(
    sql`SUM(${importOrderItems.quantityOrdered} * ${importOrderItems.unitCostPen})`,
  ),
};

type SummaryRow = {
  order: typeof importOrders.$inferSelect;
  supplierName: string | null;
  itemCount: number;
  totalOrdered: number;
  totalReceived: number;
  totalCostPen: number;
};

function toSummary(row: SummaryRow): ImportOrderSummary {
  const { createdBy: _createdBy, ...order } = row.order;
  const base: ImportOrder = {
    ...order,
    status: order.status as ImportStatus,
    supplierName: row.supplierName,
  };
  return {
    ...base,
    itemCount: row.itemCount,
    totalOrdered: row.totalOrdered,
    totalReceived: row.totalReceived,
    totalCostPen: row.totalCostPen,
  };
}

@Injectable()
export class DrizzleImportOrderRepository extends ImportOrderRepository {
  constructor(private readonly database: DatabaseService) {
    super();
  }

  async list(filters: ImportOrderFilters, page: PageRequest): Promise<Page<ImportOrderSummary>> {
    const where = and(...this.conditions(filters));
    const rows = await this.summaryQuery()
      .where(where)
      .orderBy(desc(importOrders.number))
      .limit(page.pageSize)
      .offset(offsetOf(page));
    const [totals] = await this.database.db
      .select({ value: count() })
      .from(importOrders)
      .where(where);
    return toPage(rows.map(toSummary), Number(totals?.value ?? 0), page);
  }

  async findById(id: number): Promise<ImportOrderDetail | null> {
    const [row] = await this.summaryQuery().where(eq(importOrders.id, id)).limit(1);
    if (!row) return null;

    const items = await this.database.db
      .select({
        id: importOrderItems.id,
        importOrderId: importOrderItems.importOrderId,
        productId: importOrderItems.productId,
        productCode: products.code,
        productName: products.name,
        unit: products.unit,
        quantityOrdered: importOrderItems.quantityOrdered,
        quantityReceived: importOrderItems.quantityReceived,
        unitCostPen: importOrderItems.unitCostPen,
        notes: importOrderItems.notes,
      })
      .from(importOrderItems)
      .innerJoin(products, eq(products.id, importOrderItems.productId))
      .where(eq(importOrderItems.importOrderId, id))
      .orderBy(importOrderItems.id);

    return { ...toSummary(row), items: items satisfies ImportOrderItem[] };
  }

  async numberExists(number: number, exceptId?: number): Promise<boolean> {
    const [row] = await this.database.db
      .select({ id: importOrders.id })
      .from(importOrders)
      .where(eq(importOrders.number, number))
      .limit(1);
    return Boolean(row) && row?.id !== exceptId;
  }

  async nextNumber(): Promise<number> {
    const [row] = await this.database.db
      .select({ value: sql<number>`COALESCE(MAX(${importOrders.number}), 0)`.mapWith(Number) })
      .from(importOrders);
    return (row?.value ?? 0) + 1;
  }

  create(order: ImportOrderDraft, items: ImportItemDraft[]): Promise<ImportOrderDetail> {
    return this.database.transaction(async () => {
      let id: number;
      try {
        const [result] = await this.database.db.insert(importOrders).values(order);
        id = result.insertId;
      } catch (error) {
        if (isDuplicateEntry(error))
          throw new ConflictError(`Import #${order.number} already exists`);
        throw error;
      }
      await this.insertItems(id, items);
      return this.requireById(id);
    });
  }

  update(
    id: number,
    changes: ImportOrderChanges,
    items?: ImportItemDraft[],
  ): Promise<ImportOrderDetail> {
    return this.database.transaction(async () => {
      const values = Object.fromEntries(
        Object.entries(changes).filter(([, value]) => value !== undefined),
      );
      try {
        if (Object.keys(values).length > 0) {
          await this.database.db.update(importOrders).set(values).where(eq(importOrders.id, id));
        }
      } catch (error) {
        if (isDuplicateEntry(error)) throw new ConflictError('Import number already exists');
        throw error;
      }
      if (items) {
        await this.database.db
          .delete(importOrderItems)
          .where(eq(importOrderItems.importOrderId, id));
        await this.insertItems(id, items);
      }
      return this.requireById(id);
    });
  }

  async recordReceipt(id: number, lines: ReceivedLine[], receivedAt: string): Promise<void> {
    for (const line of lines) {
      await this.database.db
        .update(importOrderItems)
        .set({ quantityReceived: line.quantityReceived })
        .where(and(eq(importOrderItems.id, line.itemId), eq(importOrderItems.importOrderId, id)));
    }
    await this.database.db
      .update(importOrders)
      .set({ status: 'RECEIVED', receivedAt })
      .where(eq(importOrders.id, id));
  }

  async delete(id: number): Promise<void> {
    await this.database.db.delete(importOrders).where(eq(importOrders.id, id));
  }

  private summaryQuery() {
    return this.database.db
      .select(summaryColumns)
      .from(importOrders)
      .leftJoin(suppliers, eq(suppliers.id, importOrders.supplierId))
      .$dynamic();
  }

  private async insertItems(importOrderId: number, items: ImportItemDraft[]): Promise<void> {
    if (items.length === 0) return;
    await this.database.db
      .insert(importOrderItems)
      .values(items.map((item) => ({ ...item, importOrderId })));
  }

  private conditions(filters: ImportOrderFilters): SQL[] {
    const conditions: SQL[] = [];
    if (filters.status) conditions.push(eq(importOrders.status, filters.status));
    if (filters.supplierId) conditions.push(eq(importOrders.supplierId, filters.supplierId));

    if (filters.productId) {
      conditions.push(
        exists(
          this.database.db
            .select({ one: sql`1` })
            .from(importOrderItems)
            .where(
              and(
                eq(importOrderItems.importOrderId, importOrders.id),
                eq(importOrderItems.productId, filters.productId),
              ),
            ),
        ),
      );
    }

    if (filters.search) {
      const term = `%${escapeLike(filters.search)}%`;
      const numeric = Number(filters.search.replace('#', ''));
      const productMatch = exists(
        this.database.db
          .select({ one: sql`1` })
          .from(importOrderItems)
          .innerJoin(products, eq(products.id, importOrderItems.productId))
          .where(
            and(
              eq(importOrderItems.importOrderId, importOrders.id),
              or(like(products.code, term), like(products.name, term)),
            ),
          ),
      );
      const match = or(
        Number.isInteger(numeric) && numeric > 0 ? eq(importOrders.number, numeric) : undefined,
        like(importOrders.reference, term),
        productMatch,
      );
      if (match) conditions.push(match);
    }

    const date = sql`COALESCE(${importOrders.receivedAt}, ${importOrders.orderedAt}, DATE(${importOrders.createdAt}))`;
    if (filters.from) conditions.push(sql`${date} >= ${filters.from}`);
    if (filters.to) conditions.push(sql`${date} <= ${filters.to}`);
    return conditions;
  }

  private async requireById(id: number): Promise<ImportOrderDetail> {
    const order = await this.findById(id);
    if (!order) throw new NotFoundError('Import order', id);
    return order;
  }
}
