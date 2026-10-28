import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from './config/config.module.js';
import { HealthController } from './health.controller.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { EquipmentModule } from './modules/equipment/equipment.module.js';
import { ImportsModule } from './modules/imports/imports.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { ReorderModule } from './modules/reorder/reorder.module.js';
import { SuppliersModule } from './modules/suppliers/suppliers.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { DatabaseModule } from './shared/infrastructure/database/database.module.js';
import { SpreadsheetModule } from './shared/infrastructure/spreadsheet/spreadsheet.module.js';
import { DomainExceptionFilter } from './shared/presentation/domain-exception.filter.js';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    SpreadsheetModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 600 }]),
    AuthModule,
    UsersModule,
    CategoriesModule,
    SuppliersModule,
    EquipmentModule,
    ProductsModule,
    InventoryModule,
    ImportsModule,
    ReorderModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
