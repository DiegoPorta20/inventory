import { Injectable } from '@nestjs/common';
import { BusinessRuleError, NotFoundError } from '../../../../shared/domain/errors.js';
import { slugify } from '../../../../shared/domain/slug.js';
import {
  MAX_CATEGORY_DEPTH,
  type Category,
  type CategoryWithCount,
} from '../../domain/category.js';
import { CategoryRepository } from '../ports/category.repository.js';

export interface CategoryInput {
  name: string;
  parentId?: number | null;
  sortOrder?: number;
}

@Injectable()
export class ListCategories {
  constructor(private readonly categories: CategoryRepository) {}

  execute(): Promise<CategoryWithCount[]> {
    return this.categories.findAllWithCounts();
  }
}

@Injectable()
export class CreateCategory {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(input: CategoryInput): Promise<Category> {
    const parentId = input.parentId ?? null;
    await assertValidParent(this.categories, parentId);
    return this.categories.create({
      name: input.name,
      slug: await uniqueSlug(this.categories, input.name),
      parentId,
      sortOrder: input.sortOrder ?? 0,
    });
  }
}

@Injectable()
export class UpdateCategory {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(id: number, input: Partial<CategoryInput>): Promise<Category> {
    const existing = await this.categories.findById(id);
    if (!existing) throw new NotFoundError('Category', id);

    if (input.parentId !== undefined) {
      if (input.parentId === id) {
        throw new BusinessRuleError(
          'INVALID_CATEGORY_PARENT',
          'A category cannot be its own parent',
        );
      }
      await assertValidParent(this.categories, input.parentId);
      if (input.parentId !== null && (await this.categories.countChildren(id)) > 0) {
        throw new BusinessRuleError(
          'CATEGORY_DEPTH_EXCEEDED',
          `Categories support at most ${MAX_CATEGORY_DEPTH} levels`,
        );
      }
    }

    return this.categories.update(id, {
      name: input.name,
      parentId: input.parentId,
      sortOrder: input.sortOrder,
      slug:
        input.name && input.name !== existing.name
          ? await uniqueSlug(this.categories, input.name, id)
          : undefined,
    });
  }
}

@Injectable()
export class DeleteCategory {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(id: number): Promise<void> {
    if (!(await this.categories.findById(id))) throw new NotFoundError('Category', id);
    if (
      (await this.categories.countChildren(id)) > 0 ||
      (await this.categories.countProducts(id)) > 0
    ) {
      throw new BusinessRuleError(
        'CATEGORY_IN_USE',
        'Category has subcategories or products; move them before deleting',
      );
    }
    await this.categories.delete(id);
  }
}

async function assertValidParent(
  categories: CategoryRepository,
  parentId: number | null,
): Promise<void> {
  if (parentId === null) return;
  const parent = await categories.findById(parentId);
  if (!parent) throw new NotFoundError('Category', parentId);
  if (parent.parentId !== null) {
    throw new BusinessRuleError(
      'CATEGORY_DEPTH_EXCEEDED',
      `Categories support at most ${MAX_CATEGORY_DEPTH} levels`,
    );
  }
}

async function uniqueSlug(
  categories: CategoryRepository,
  name: string,
  exceptId?: number,
): Promise<string> {
  const base = slugify(name) || 'category';
  let candidate = base;
  for (let suffix = 2; await categories.slugExists(candidate, exceptId); suffix++) {
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}
