import { Injectable } from '@nestjs/common';
import { count, eq } from 'drizzle-orm';
import { ConflictError, NotFoundError } from '../../../shared/domain/errors.js';
import { DatabaseService } from '../../../shared/infrastructure/database/database.service.js';
import { isDuplicateEntry } from '../../../shared/infrastructure/database/mysql-errors.js';
import { costCenters, products } from '../../../shared/infrastructure/database/schema.js';
import { CostCenterRepository } from '../application/ports/cost-center.repository.js';
import type { CostCenter, CostCenterWithCount } from '../domain/cost-center.js';

const DUPLICATE_MESSAGE = 'A cost center with this name already exists';

@Injectable()
export class DrizzleCostCenterRepository extends CostCenterRepository {
  constructor(private readonly database: DatabaseService) {
    super();
  }

  async findAllWithCounts(): Promise<CostCenterWithCount[]> {
    const rows = await this.database.db
      .select({ id: costCenters.id, name: costCenters.name, productCount: count(products.id) })
      .from(costCenters)
      .leftJoin(products, eq(products.costCenterId, costCenters.id))
      .groupBy(costCenters.id)
      .orderBy(costCenters.name);
    return rows.map((row) => ({ ...row, productCount: Number(row.productCount) }));
  }

  async findById(id: number): Promise<CostCenter | null> {
    const [row] = await this.database.db
      .select({ id: costCenters.id, name: costCenters.name })
      .from(costCenters)
      .where(eq(costCenters.id, id))
      .limit(1);
    return row ?? null;
  }

  async create(name: string): Promise<CostCenter> {
    try {
      const [result] = await this.database.db.insert(costCenters).values({ name });
      return this.requireById(result.insertId);
    } catch (error) {
      if (isDuplicateEntry(error)) throw new ConflictError(DUPLICATE_MESSAGE);
      throw error;
    }
  }

  async rename(id: number, name: string): Promise<CostCenter> {
    try {
      await this.database.db.update(costCenters).set({ name }).where(eq(costCenters.id, id));
    } catch (error) {
      if (isDuplicateEntry(error)) throw new ConflictError(DUPLICATE_MESSAGE);
      throw error;
    }
    return this.requireById(id);
  }

  async countProducts(id: number): Promise<number> {
    const [row] = await this.database.db
      .select({ value: count() })
      .from(products)
      .where(eq(products.costCenterId, id));
    return Number(row?.value ?? 0);
  }

  async delete(id: number): Promise<void> {
    await this.database.db.delete(costCenters).where(eq(costCenters.id, id));
  }

  private async requireById(id: number): Promise<CostCenter> {
    const costCenter = await this.findById(id);
    if (!costCenter) throw new NotFoundError('Cost center', id);
    return costCenter;
  }
}
