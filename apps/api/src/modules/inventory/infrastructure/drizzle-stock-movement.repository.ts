import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, like, lt, or, type SQL } from 'drizzle-orm';
import { offsetOf, toPage, type Page, type PageRequest } from '../../../shared/application/page.js';
import { NotFoundError } from '../../../shared/domain/errors.js';
import { startOfBusinessDay, startOfNextBusinessDay } from '../../../shared/domain/time.js';
import { DatabaseService } from '../../../shared/infrastructure/database/database.service.js';
import { products, stockMovements, users } from '../../../shared/infrastructure/database/schema.js';
import {
  StockMovementRepository,
  type MovementFilters,
  type NewStockMovement,
} from '../application/ports/stock-movement.repository.js';
import type {
  MovementReason,
  MovementType,
  ReferenceType,
  StockMovement,
  StockMovementView,
} from '../domain/stock-movement.js';

type MovementRow = typeof stockMovements.$inferSelect;

const toMovement = (row: MovementRow): StockMovement => ({
  ...row,
  type: row.type as MovementType,
  reason: row.reason as MovementReason,
  referenceType: row.referenceType as ReferenceType | null,
});

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

@Injectable()
export class DrizzleStockMovementRepository extends StockMovementRepository {
  constructor(private readonly database: DatabaseService) {
    super();
  }

  async create(movement: NewStockMovement): Promise<StockMovement> {
    const [result] = await this.database.db.insert(stockMovements).values({
      productId: movement.productId,
      type: movement.type,
      reason: movement.reason,
      quantity: movement.quantity,
      stockAfter: movement.stockAfter,
      unitPriceUsd: movement.unitPriceUsd ?? null,
      counterparty: movement.counterparty ?? null,
      referenceType: movement.referenceType ?? null,
      referenceId: movement.referenceId ?? null,
      note: movement.note ?? null,
      userId: movement.userId ?? null,
      occurredAt: movement.occurredAt ?? new Date(),
    });
    const [row] = await this.database.db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.id, result.insertId))
      .limit(1);
    if (!row) throw new NotFoundError('Stock movement', result.insertId);
    return toMovement(row);
  }

  async search(filters: MovementFilters, page: PageRequest): Promise<Page<StockMovementView>> {
    const where = and(...this.conditions(filters));
    const rows = await this.viewQuery(where).limit(page.pageSize).offset(offsetOf(page));
    const [totals] = await this.database.db
      .select({ value: count() })
      .from(stockMovements)
      .innerJoin(products, eq(products.id, stockMovements.productId))
      .where(where);
    return toPage(
      rows.map((row) => this.toView(row)),
      Number(totals?.value ?? 0),
      page,
    );
  }

  async searchAll(filters: MovementFilters, limit: number): Promise<StockMovementView[]> {
    const rows = await this.viewQuery(and(...this.conditions(filters))).limit(limit);
    return rows.map((row) => this.toView(row));
  }

  private viewQuery(where: SQL | undefined) {
    return this.database.db
      .select({
        movement: stockMovements,
        productCode: products.code,
        productName: products.name,
        unit: products.unit,
        userName: users.name,
      })
      .from(stockMovements)
      .innerJoin(products, eq(products.id, stockMovements.productId))
      .leftJoin(users, eq(users.id, stockMovements.userId))
      .where(where)
      .orderBy(desc(stockMovements.occurredAt), desc(stockMovements.id))
      .$dynamic();
  }

  private toView(row: {
    movement: MovementRow;
    productCode: string;
    productName: string;
    unit: string;
    userName: string | null;
  }): StockMovementView {
    return {
      ...toMovement(row.movement),
      productCode: row.productCode,
      productName: row.productName,
      unit: row.unit,
      userName: row.userName,
    };
  }

  private conditions(filters: MovementFilters): SQL[] {
    const conditions: SQL[] = [];
    if (filters.productId) conditions.push(eq(stockMovements.productId, filters.productId));
    if (filters.type) conditions.push(eq(stockMovements.type, filters.type));
    if (filters.reason) conditions.push(eq(stockMovements.reason, filters.reason));
    if (filters.userId) conditions.push(eq(stockMovements.userId, filters.userId));
    if (filters.referenceType)
      conditions.push(eq(stockMovements.referenceType, filters.referenceType));
    if (filters.referenceId) conditions.push(eq(stockMovements.referenceId, filters.referenceId));
    if (filters.from)
      conditions.push(gte(stockMovements.occurredAt, startOfBusinessDay(filters.from)));
    if (filters.to)
      conditions.push(lt(stockMovements.occurredAt, startOfNextBusinessDay(filters.to)));
    for (const word of (filters.search ?? '').split(/\s+/).filter(Boolean)) {
      const term = `%${escapeLike(word)}%`;
      const match = or(
        like(products.code, term),
        like(products.name, term),
        like(stockMovements.counterparty, term),
      );
      if (match) conditions.push(match);
    }
    return conditions;
  }
}
