import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module.js';
import { StockCountRepository } from './application/ports/stock-count.repository.js';
import { StockMovementRepository } from './application/ports/stock-movement.repository.js';
import { StockLedger } from './application/stock-ledger.js';
import { RegisterStockMovement } from './application/use-cases/register-stock-movement.js';
import {
  ExportStockMovements,
  SearchStockMovements,
} from './application/use-cases/search-stock-movements.js';
import {
  CancelStockCount,
  CompleteStockCount,
  ConfirmPendingCountItems,
  CreateStockCount,
  GetStockCount,
  ListStockCountItems,
  ListStockCounts,
  RecordCountedQuantity,
} from './application/use-cases/stock-count-use-cases.js';
import { DrizzleStockCountRepository } from './infrastructure/drizzle-stock-count.repository.js';
import { DrizzleStockMovementRepository } from './infrastructure/drizzle-stock-movement.repository.js';
import { StockCountsController } from './presentation/stock-counts.controller.js';
import { StockMovementsController } from './presentation/stock-movements.controller.js';

@Module({
  imports: [ProductsModule],
  controllers: [StockMovementsController, StockCountsController],
  providers: [
    StockLedger,
    RegisterStockMovement,
    SearchStockMovements,
    ExportStockMovements,
    CreateStockCount,
    ListStockCounts,
    GetStockCount,
    ListStockCountItems,
    RecordCountedQuantity,
    ConfirmPendingCountItems,
    CompleteStockCount,
    CancelStockCount,
    { provide: StockMovementRepository, useClass: DrizzleStockMovementRepository },
    { provide: StockCountRepository, useClass: DrizzleStockCountRepository },
  ],
  exports: [StockLedger],
})
export class InventoryModule {}
