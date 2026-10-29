import { Injectable } from '@nestjs/common';
import { alias } from 'drizzle-orm/mysql-core';
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gt,
  inArray,
  isNotNull,
  isNull,
  like,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { offsetOf, toPage, type Page, type PageRequest } from '../../../shared/application/page.js';
import { ConflictError, NotFoundError } from '../../../shared/domain/errors.js';
import { DatabaseService } from '../../../shared/infrastructure/database/database.service.js';
import { isDuplicateEntry } from '../../../shared/infrastructure/database/mysql-errors.js';
import {
  categories,
  costCenters,
  equipmentModels,
  importOrderItems,
  productEquipment,
  products,
  stockMovements,
} from '../../../shared/infrastructure/database/schema.js';
import { incomingQtySql } from '../../../shared/infrastructure/database/sql-fragments.js';
import {
  ProductRepository,
  type BulkProductChanges,
  type ProductChanges,
  type ProductDetail,
  type ProductDraft,
  type ProductFilters,
  type ProductSortField,
} from '../application/ports/product.repository.js';
import {
  stockStatusOf,
  type Product,
  type ProductListItem,
  type UnitOfMeasure,
} from '../domain/product.js';

type ProductRow = typeof products.$inferSelect;

const toProduct = (row: ProductRow): Product => ({ ...row, unit: row.unit as UnitOfMeasure });

interface ListRow {
  product: ProductRow;
  categoryName: string | null;
  costCenterName: string | null;
  incomingQty: number;
}

const toListRow = ({
  product,
  categoryName,
  costCenterName,
  incomingQty,
}: ListRow): ProductListItem => ({
  ...toProduct(product),
  categoryName,
  costCenterName,
  incomingQty,
  stockStatus: stockStatusOf(product.stock, product.minStock),
});

const SORT_COLUMNS = {
  code: products.code,
  name: products.name,
  stock: products.stock,
  updatedAt: products.updatedAt,
  cost: products.costPen,
  price: products.pricePen,
} as const satisfies Record<ProductSortField, unknown>;

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

@Injectable()
export class DrizzleProductRepository extends ProductRepository {
  constructor(private readonly database: DatabaseService) {
    super();
  }

  async search(filters: ProductFilters, page: PageRequest): Promise<Page<ProductListItem>> {
    const where = and(...this.conditions(filters));
    const rows = await this.listQuery(where, filters).limit(page.pageSize).offset(offsetOf(page));
    const [totals] = await this.database.db.select({ value: count() }).from(products).where(where);
    return toPage(rows.map(toListRow), Number(totals?.value ?? 0), page);
  }

  async searchAll(filters: ProductFilters, limit: number): Promise<ProductListItem[]> {
    const rows = await this.listQuery(and(...this.conditions(filters)), filters).limit(limit);
    return rows.map(toListRow);
  }

  async findById(id: number): Promise<Product | null> {
    const [row] = await this.database.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    return row ? toProduct(row) : null;
  }

  async findByIdForUpdate(id: number): Promise<Product | null> {
    const [row] = await this.database.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1)
      .for('update');
    return row ? toProduct(row) : null;
  }

  async findByCode(code: string): Promise<Product | null> {
    const [row] = await this.database.db
      .select()
      .from(products)
      .where(eq(products.code, code))
      .limit(1);
    return row ? toProduct(row) : null;
  }

  async findByCodes(codes: string[]): Promise<Product[]> {
    if (codes.length === 0) return [];
    const rows = await this.database.db
      .select()
      .from(products)
      .where(inArray(products.code, codes));
    return rows.map(toProduct);
  }

  async findDetail(id: number): Promise<ProductDetail | null> {
    const parent = alias(categories, 'parent_category');
    const [row] = await this.database.db
      .select({
        product: products,
        categoryName: categories.name,
        costCenterName: costCenters.name,
        parentName: parent.name,
        incomingQty: incomingQtySql,
      })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .leftJoin(costCenters, eq(costCenters.id, products.costCenterId))
      .leftJoin(parent, eq(parent.id, categories.parentId))
      .where(eq(products.id, id))
      .limit(1);
    if (!row) return null;

    const equipment = await this.database.db
      .select({
        id: equipmentModels.id,
        name: equipmentModels.name,
        brand: equipmentModels.brand,
        description: equipmentModels.description,
      })
      .from(productEquipment)
      .innerJoin(equipmentModels, eq(equipmentModels.id, productEquipment.equipmentId))
      .where(eq(productEquipment.productId, id))
      .orderBy(equipmentModels.name);

    return {
      ...toListRow(row),
      categoryPath: row.categoryName
        ? [row.parentName, row.categoryName].filter(Boolean).join(' / ')
        : null,
      equipment,
    };
  }

  async nextInternalSequence(): Promise<number> {
    const [row] = await this.database.db
      .select({
        value:
          sql<number>`COALESCE(MAX(CAST(SUBSTRING(${products.code}, 5) AS UNSIGNED)), 0)`.mapWith(
            Number,
          ),
      })
      .from(products)
      .where(like(products.code, 'INT-%'));
    return (row?.value ?? 0) + 1;
  }

  create(draft: ProductDraft, equipmentIds: number[]): Promise<Product> {
    return this.database.transaction(async () => {
      let id: number;
      try {
        const [result] = await this.database.db.insert(products).values(draft);
        id = result.insertId;
      } catch (error) {
        if (isDuplicateEntry(error))
          throw new ConflictError(`Product code ${draft.code} already exists`);
        throw error;
      }
      await this.replaceEquipment(id, equipmentIds);
      return this.requireById(id);
    });
  }

  update(id: number, changes: ProductChanges, equipmentIds?: number[]): Promise<Product> {
    return this.database.transaction(async () => {
      const values = Object.fromEntries(
        Object.entries(changes).filter(([, value]) => value !== undefined),
      );
      try {
        if (Object.keys(values).length > 0) {
          await this.database.db.update(products).set(values).where(eq(products.id, id));
        }
      } catch (error) {
        if (isDuplicateEntry(error)) throw new ConflictError('Product code already exists');
        throw error;
      }
      if (equipmentIds) await this.replaceEquipment(id, equipmentIds);
      return this.requireById(id);
    });
  }

  async bulkUpdate(ids: number[], changes: BulkProductChanges): Promise<number> {
    const values = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    );
    const [result] = await this.database.db
      .update(products)
      .set(values)
      .where(inArray(products.id, ids));
    return result.affectedRows;
  }

  async setStock(id: number, stock: number): Promise<void> {
    await this.database.db.update(products).set({ stock }).where(eq(products.id, id));
  }

  async hasHistory(id: number): Promise<boolean> {
    const [movement] = await this.database.db
      .select({ id: stockMovements.id })
      .from(stockMovements)
      .where(eq(stockMovements.productId, id))
      .limit(1);
    if (movement) return true;
    const [line] = await this.database.db
      .select({ id: importOrderItems.id })
      .from(importOrderItems)
      .where(eq(importOrderItems.productId, id))
      .limit(1);
    return Boolean(line);
  }

  async delete(id: number): Promise<void> {
    await this.database.db.delete(products).where(eq(products.id, id));
  }

  private listQuery(where: SQL | undefined, filters: ProductFilters) {
    const direction = filters.sortDirection === 'desc' ? desc : asc;
    return this.database.db
      .select({
        product: products,
        categoryName: categories.name,
        costCenterName: costCenters.name,
        incomingQty: incomingQtySql,
      })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .leftJoin(costCenters, eq(costCenters.id, products.costCenterId))
      .where(where)
      .orderBy(direction(SORT_COLUMNS[filters.sortBy]), asc(products.id))
      .$dynamic();
  }

  private conditions(filters: ProductFilters): SQL[] {
    const conditions: SQL[] = [];

    for (const word of (filters.search ?? '').split(/\s+/).filter(Boolean)) {
      const term = `%${escapeLike(word)}%`;
      const match = or(
        like(products.code, term),
        like(products.name, term),
        like(products.location, term),
      );
      if (match) conditions.push(match);
    }

    if (filters.categoryId) {
      conditions.push(
        sql`${products.categoryId} IN (SELECT ${categories.id} FROM ${categories} WHERE ${categories.id} = ${filters.categoryId} OR ${categories.parentId} = ${filters.categoryId})`,
      );
    }
    if (filters.unit) conditions.push(eq(products.unit, filters.unit));
    if (filters.costCenterId) conditions.push(eq(products.costCenterId, filters.costCenterId));
    if (filters.isConsignment !== undefined) {
      conditions.push(eq(products.isConsignment, filters.isConsignment));
    }
    if (filters.hasPrice !== undefined) {
      conditions.push(filters.hasPrice ? isNotNull(products.pricePen) : isNull(products.pricePen));
    }
    if (filters.isActive !== undefined) conditions.push(eq(products.isActive, filters.isActive));
    if (filters.isInternalCode !== undefined) {
      conditions.push(eq(products.isInternalCode, filters.isInternalCode));
    }
    if (filters.needsReorder) {
      conditions.push(
        sql`${products.minStock} > 0 AND (${products.stock} + ${incomingQtySql}) <= ${products.minStock}`,
      );
    }
    if (filters.importOrderId) {
      conditions.push(
        exists(
          this.database.db
            .select({ one: sql`1` })
            .from(importOrderItems)
            .where(
              and(
                eq(importOrderItems.productId, products.id),
                eq(importOrderItems.importOrderId, filters.importOrderId),
              ),
            ),
        ),
      );
    }
    if (filters.equipmentId) {
      conditions.push(
        exists(
          this.database.db
            .select({ one: sql`1` })
            .from(productEquipment)
            .where(
              and(
                eq(productEquipment.productId, products.id),
                eq(productEquipment.equipmentId, filters.equipmentId),
              ),
            ),
        ),
      );
    }

    const status = this.stockStatusCondition(filters.stockStatus);
    if (status) conditions.push(status);
    return conditions;
  }

  private stockStatusCondition(status: ProductFilters['stockStatus']): SQL | undefined {
    switch (status) {
      case 'OUT':
        return eq(products.stock, 0);
      case 'LOW':
        return and(
          gt(products.stock, 0),
          gt(products.minStock, 0),
          lte(products.stock, products.minStock),
        );
      case 'OK':
        return and(
          gt(products.stock, 0),
          or(eq(products.minStock, 0), gt(products.stock, products.minStock)),
        );
      case 'UNCONFIGURED':
        return and(gt(products.stock, 0), eq(products.minStock, 0));
      default:
        return undefined;
    }
  }

  private async replaceEquipment(productId: number, equipmentIds: number[]): Promise<void> {
    await this.database.db
      .delete(productEquipment)
      .where(eq(productEquipment.productId, productId));
    if (equipmentIds.length > 0) {
      await this.database.db
        .insert(productEquipment)
        .values(equipmentIds.map((equipmentId) => ({ productId, equipmentId })));
    }
  }

  private async requireById(id: number): Promise<Product> {
    const product = await this.findById(id);
    if (!product) throw new NotFoundError('Product', id);
    return product;
  }
}
