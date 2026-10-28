import { Injectable } from '@nestjs/common';
import { eq, ne, and, count, sql } from 'drizzle-orm';
import { NotFoundError } from '../../../shared/domain/errors.js';
import { DatabaseService } from '../../../shared/infrastructure/database/database.service.js';
import { categories, products } from '../../../shared/infrastructure/database/schema.js';
import {
  CategoryRepository,
  type CategoryChanges,
  type NewCategory,
} from '../application/ports/category.repository.js';
import type { Category, CategoryWithCount } from '../domain/category.js';

const columns = {
  id: categories.id,
  name: categories.name,
  slug: categories.slug,
  parentId: categories.parentId,
  sortOrder: categories.sortOrder,
};

@Injectable()
export class DrizzleCategoryRepository extends CategoryRepository {
  constructor(private readonly database: DatabaseService) {
    super();
  }

  async findAllWithCounts(): Promise<CategoryWithCount[]> {
    const rows = await this.database.db
      .select({ ...columns, productCount: count(products.id) })
      .from(categories)
      .leftJoin(products, eq(products.categoryId, categories.id))
      .groupBy(categories.id)
      .orderBy(sql`${categories.sortOrder}`, categories.name);
    return rows.map((row) => ({ ...row, productCount: Number(row.productCount) }));
  }

  async findById(id: number): Promise<Category | null> {
    const [row] = await this.database.db
      .select(columns)
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    return row ?? null;
  }

  async slugExists(slug: string, exceptId?: number): Promise<boolean> {
    const condition = exceptId
      ? and(eq(categories.slug, slug), ne(categories.id, exceptId))
      : eq(categories.slug, slug);
    const [row] = await this.database.db
      .select({ id: categories.id })
      .from(categories)
      .where(condition)
      .limit(1);
    return Boolean(row);
  }

  async countChildren(id: number): Promise<number> {
    const [row] = await this.database.db
      .select({ value: count() })
      .from(categories)
      .where(eq(categories.parentId, id));
    return Number(row?.value ?? 0);
  }

  async countProducts(id: number): Promise<number> {
    const [row] = await this.database.db
      .select({ value: count() })
      .from(products)
      .where(eq(products.categoryId, id));
    return Number(row?.value ?? 0);
  }

  async create(category: NewCategory): Promise<Category> {
    const [result] = await this.database.db.insert(categories).values(category);
    return this.requireById(result.insertId);
  }

  async update(id: number, changes: CategoryChanges): Promise<Category> {
    const values = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    );
    if (Object.keys(values).length > 0) {
      await this.database.db.update(categories).set(values).where(eq(categories.id, id));
    }
    return this.requireById(id);
  }

  async delete(id: number): Promise<void> {
    await this.database.db.delete(categories).where(eq(categories.id, id));
  }

  private async requireById(id: number): Promise<Category> {
    const category = await this.findById(id);
    if (!category) throw new NotFoundError('Category', id);
    return category;
  }
}
