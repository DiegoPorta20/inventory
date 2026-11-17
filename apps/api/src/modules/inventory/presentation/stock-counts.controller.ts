import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/domain/auth.js';
import { CurrentUser, RequirePermission } from '../../../shared/presentation/decorators.js';
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe.js';
import {
  CancelStockCount,
  CompleteStockCount,
  ConfirmPendingCountItems,
  CreateStockCount,
  GetStockCount,
  ListStockCountItems,
  ListStockCounts,
  RecordCountedQuantity,
} from '../application/use-cases/stock-count-use-cases.js';
import {
  createStockCountSchema,
  listCountItemsSchema,
  listStockCountsSchema,
  recordCountSchema,
  type CreateStockCountBody,
  type ListCountItemsQuery,
  type ListStockCountsQuery,
  type RecordCountBody,
} from './stock-counts.schemas.js';

@Controller('stock-counts')
export class StockCountsController {
  constructor(
    private readonly createCount: CreateStockCount,
    private readonly listCounts: ListStockCounts,
    private readonly getCount: GetStockCount,
    private readonly listItems: ListStockCountItems,
    private readonly recordCount: RecordCountedQuantity,
    private readonly confirmPending: ConfirmPendingCountItems,
    private readonly completeCount: CompleteStockCount,
    private readonly cancelCount: CancelStockCount,
  ) {}

  @Get()
  @RequirePermission('counts.view')
  list(@Query(new ZodValidationPipe(listStockCountsSchema)) query: ListStockCountsQuery) {
    const { page, pageSize, ...filters } = query;
    return this.listCounts.execute(filters, { page, pageSize });
  }

  @Post()
  @RequirePermission('counts.create')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createStockCountSchema)) body: CreateStockCountBody,
  ) {
    return this.createCount.execute(body, user.id);
  }

  @Get(':id')
  @RequirePermission('counts.view')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.getCount.execute(id);
  }

  @Get(':id/items')
  @RequirePermission('counts.view')
  items(
    @Param('id', ParseIntPipe) id: number,
    @Query(new ZodValidationPipe(listCountItemsSchema)) query: ListCountItemsQuery,
  ) {
    const { page, pageSize, ...filters } = query;
    return this.listItems.execute(id, filters, { page, pageSize });
  }

  @Patch(':id/items/:itemId')
  @RequirePermission('counts.record')
  record(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body(new ZodValidationPipe(recordCountSchema)) body: RecordCountBody,
  ) {
    return this.recordCount.execute(id, itemId, body);
  }

  @Post(':id/confirm-pending')
  @RequirePermission('counts.record')
  @HttpCode(200)
  confirm(@Param('id', ParseIntPipe) id: number) {
    return this.confirmPending.execute(id);
  }

  @Post(':id/complete')
  @RequirePermission('counts.complete')
  @HttpCode(200)
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.completeCount.execute(id, user.id);
  }

  @Post(':id/cancel')
  @RequirePermission('counts.complete')
  @HttpCode(200)
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.cancelCount.execute(id);
  }
}
