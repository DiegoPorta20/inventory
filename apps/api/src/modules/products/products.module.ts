import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module.js';
import { CostCentersModule } from '../cost-centers/cost-centers.module.js';
import { EquipmentModule } from '../equipment/equipment.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { ProductRepository } from './application/ports/product.repository.js';
import { ProductReferences } from './application/product-references.js';
import { BulkUpdateProducts } from './application/use-cases/bulk-update-products.js';
import { CreateProduct } from './application/use-cases/create-product.js';
import { DeleteProduct } from './application/use-cases/delete-product.js';
import {
  ExportPriceList,
  ExportProducts,
  GetProduct,
  SearchProducts,
} from './application/use-cases/query-products.js';
import { UpdateProduct } from './application/use-cases/update-product.js';
import { DrizzleProductRepository } from './infrastructure/drizzle-product.repository.js';
import { ProductsController } from './presentation/products.controller.js';

@Module({
  imports: [CategoriesModule, EquipmentModule, CostCentersModule, SettingsModule],
  controllers: [ProductsController],
  providers: [
    ProductReferences,
    SearchProducts,
    GetProduct,
    ExportProducts,
    ExportPriceList,
    CreateProduct,
    UpdateProduct,
    DeleteProduct,
    BulkUpdateProducts,
    { provide: ProductRepository, useClass: DrizzleProductRepository },
  ],
  exports: [ProductRepository],
})
export class ProductsModule {}
