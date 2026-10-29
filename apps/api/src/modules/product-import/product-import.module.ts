import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module.js';
import { CostCentersModule } from '../cost-centers/cost-centers.module.js';
import { EquipmentModule } from '../equipment/equipment.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { ProductsModule } from '../products/products.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import {
  DownloadProductImportTemplate,
  ImportProducts,
  PreviewProductImport,
  ProductImportPlanner,
} from './application/product-import-use-cases.js';
import { ProductImportController } from './presentation/product-import.controller.js';

/** Bulk create/update of products from an Excel file (kept apart from the purchase-order "imports" module). */
@Module({
  imports: [
    ProductsModule,
    InventoryModule,
    CategoriesModule,
    CostCentersModule,
    EquipmentModule,
    SettingsModule,
  ],
  controllers: [ProductImportController],
  providers: [
    ProductImportPlanner,
    DownloadProductImportTemplate,
    PreviewProductImport,
    ImportProducts,
  ],
})
export class ProductImportModule {}
