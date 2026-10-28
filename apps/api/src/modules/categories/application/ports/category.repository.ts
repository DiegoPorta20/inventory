import type { Category, CategoryWithCount } from '../../domain/category.js';

export interface NewCategory {
  name: string;
  slug: string;
  parentId: number | null;
  sortOrder: number;
}

export type CategoryChanges = Partial<NewCategory>;

export abstract class CategoryRepository {
  abstract findAllWithCounts(): Promise<CategoryWithCount[]>;
  abstract findById(id: number): Promise<Category | null>;
  abstract slugExists(slug: string, exceptId?: number): Promise<boolean>;
  abstract countChildren(id: number): Promise<number>;
  abstract countProducts(id: number): Promise<number>;
  abstract create(category: NewCategory): Promise<Category>;
  abstract update(id: number, changes: CategoryChanges): Promise<Category>;
  abstract delete(id: number): Promise<void>;
}
