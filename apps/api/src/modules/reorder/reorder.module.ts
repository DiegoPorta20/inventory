import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module.js';
import {
  ExportReorderSuggestions,
  GetReorderSuggestions,
} from './application/use-cases/reorder-use-cases.js';
import { ReorderController } from './presentation/reorder.controller.js';

@Module({
  imports: [ProductsModule],
  controllers: [ReorderController],
  providers: [GetReorderSuggestions, ExportReorderSuggestions],
})
export class ReorderModule {}
