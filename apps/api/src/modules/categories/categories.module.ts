import { Module } from '@nestjs/common';
import { CategoryRepository } from './application/ports/category.repository.js';
import {
  CreateCategory,
  DeleteCategory,
  ListCategories,
  UpdateCategory,
} from './application/use-cases/category-use-cases.js';
import { DrizzleCategoryRepository } from './infrastructure/drizzle-category.repository.js';
import { CategoriesController } from './presentation/categories.controller.js';

@Module({
  controllers: [CategoriesController],
  providers: [
    ListCategories,
    CreateCategory,
    UpdateCategory,
    DeleteCategory,
    { provide: CategoryRepository, useClass: DrizzleCategoryRepository },
  ],
  exports: [CategoryRepository],
})
export class CategoriesModule {}
