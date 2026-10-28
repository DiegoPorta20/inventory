import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe.js';
import { XLSX_CONTENT_TYPE } from '../../../shared/presentation/http.js';
import { BulkUpdateProducts } from '../application/use-cases/bulk-update-products.js';
import { CreateProduct } from '../application/use-cases/create-product.js';
import { DeleteProduct } from '../application/use-cases/delete-product.js';
import {
  ExportProducts,
  GetProduct,
  SearchProducts,
} from '../application/use-cases/query-products.js';
import { UpdateProduct } from '../application/use-cases/update-product.js';
import {
  bulkUpdateProductsSchema,
  createProductSchema,
  exportProductsSchema,
  listProductsSchema,
  updateProductSchema,
  type BulkUpdateProductsBody,
  type CreateProductBody,
  type ExportProductsQuery,
  type ListProductsQuery,
  type UpdateProductBody,
} from './products.schemas.js';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly searchProducts: SearchProducts,
    private readonly getProduct: GetProduct,
    private readonly createProduct: CreateProduct,
    private readonly updateProduct: UpdateProduct,
    private readonly deleteProduct: DeleteProduct,
    private readonly bulkUpdateProducts: BulkUpdateProducts,
    private readonly exportProducts: ExportProducts,
  ) {}

  @Get()
  list(@Query(new ZodValidationPipe(listProductsSchema)) query: ListProductsQuery) {
    const { page, pageSize, ...filters } = query;
    return this.searchProducts.execute(filters, { page, pageSize });
  }

  @Get('export')
  @Header('Content-Type', XLSX_CONTENT_TYPE)
  @Header('Content-Disposition', 'attachment; filename="inventario.xlsx"')
  async export(@Query(new ZodValidationPipe(exportProductsSchema)) query: ExportProductsQuery) {
    return new StreamableFile(await this.exportProducts.execute(query));
  }

  @Patch('bulk')
  bulkUpdate(@Body(new ZodValidationPipe(bulkUpdateProductsSchema)) body: BulkUpdateProductsBody) {
    return this.bulkUpdateProducts.execute(body.ids, body.changes);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.getProduct.execute(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createProductSchema)) body: CreateProductBody) {
    return this.createProduct.execute(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductBody,
  ) {
    return this.updateProduct.execute(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.deleteProduct.execute(id);
  }
}
