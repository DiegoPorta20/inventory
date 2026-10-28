import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module.js';
import { DashboardReader } from './application/ports/dashboard.reader.js';
import { GetDashboardSummary } from './application/use-cases/get-dashboard-summary.js';
import { DrizzleDashboardReader } from './infrastructure/drizzle-dashboard.reader.js';
import { DashboardController } from './presentation/dashboard.controller.js';

@Module({
  imports: [ProductsModule],
  controllers: [DashboardController],
  providers: [GetDashboardSummary, { provide: DashboardReader, useClass: DrizzleDashboardReader }],
})
export class DashboardModule {}
