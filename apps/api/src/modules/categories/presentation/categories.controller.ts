import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe.js';
import {
  CreateCategory,
  DeleteCategory,
  ListCategories,
  UpdateCategory,
} from '../application/use-cases/category-use-cases.js';
import {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryBody,
  type UpdateCategoryBody,
} from './categories.schemas.js';
import {
  RequireAnyPermission,
  RequirePermission,
} from '../../../shared/presentation/decorators.js';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly listCategories: ListCategories,
    private readonly createCategory: CreateCategory,
    private readonly updateCategory: UpdateCategory,
    private readonly deleteCategory: DeleteCategory,
  ) {}

  @Get()
  @RequireAnyPermission('categories.view', 'products.view', 'counts.create', 'reorder.view')
  list() {
    return this.listCategories.execute();
  }

  @Post()
  @RequirePermission('categories.manage')
  create(@Body(new ZodValidationPipe(createCategorySchema)) body: CreateCategoryBody) {
    return this.createCategory.execute(body);
  }

  @Patch(':id')
  @RequirePermission('categories.manage')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateCategorySchema)) body: UpdateCategoryBody,
  ) {
    return this.updateCategory.execute(id, body);
  }

  @Delete(':id')
  @RequirePermission('categories.manage')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.deleteCategory.execute(id);
  }
}
