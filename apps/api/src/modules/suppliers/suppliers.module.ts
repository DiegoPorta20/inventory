import { Module } from '@nestjs/common';
import { SupplierRepository } from './application/ports/supplier.repository.js';
import {
  CreateSupplier,
  DeleteSupplier,
  GetSupplier,
  ListSuppliers,
  UpdateSupplier,
} from './application/use-cases/supplier-use-cases.js';
import { DrizzleSupplierRepository } from './infrastructure/drizzle-supplier.repository.js';
import { SuppliersController } from './presentation/suppliers.controller.js';

@Module({
  controllers: [SuppliersController],
  providers: [
    ListSuppliers,
    GetSupplier,
    CreateSupplier,
    UpdateSupplier,
    DeleteSupplier,
    { provide: SupplierRepository, useClass: DrizzleSupplierRepository },
  ],
  exports: [SupplierRepository],
})
export class SuppliersModule {}
