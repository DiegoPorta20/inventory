import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module.js';
import { ProductsModule } from '../products/products.module.js';
import { SuppliersModule } from '../suppliers/suppliers.module.js';
import { ImportOrderRepository } from './application/ports/import-order.repository.js';
import {
  ChangeImportStatus,
  CreateImportOrder,
  DeleteImportOrder,
  GetImportOrder,
  ImportOrderValidator,
  ListImportOrders,
  ReceiveImportOrder,
  UpdateImportOrder,
} from './application/use-cases/import-order-use-cases.js';
import { DrizzleImportOrderRepository } from './infrastructure/drizzle-import-order.repository.js';
import { ImportsController } from './presentation/imports.controller.js';

@Module({
  imports: [ProductsModule, SuppliersModule, InventoryModule],
  controllers: [ImportsController],
  providers: [
    ImportOrderValidator,
    ListImportOrders,
    GetImportOrder,
    CreateImportOrder,
    UpdateImportOrder,
    ChangeImportStatus,
    ReceiveImportOrder,
    DeleteImportOrder,
    { provide: ImportOrderRepository, useClass: DrizzleImportOrderRepository },
  ],
})
export class ImportsModule {}
