import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/domain/auth.js';
import { CurrentUser } from '../../../shared/presentation/decorators.js';
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe.js';
import {
  ChangeImportStatus,
  CreateImportOrder,
  DeleteImportOrder,
  GetImportOrder,
  ListImportOrders,
  ReceiveImportOrder,
  UpdateImportOrder,
} from '../application/use-cases/import-order-use-cases.js';
import {
  changeStatusSchema,
  createImportOrderSchema,
  listImportOrdersSchema,
  receiveImportOrderSchema,
  updateImportOrderSchema,
  type ChangeStatusBody,
  type CreateImportOrderBody,
  type ListImportOrdersQuery,
  type ReceiveImportOrderBody,
  type UpdateImportOrderBody,
} from './imports.schemas.js';

@Controller('imports')
export class ImportsController {
  constructor(
    private readonly listOrders: ListImportOrders,
    private readonly getOrder: GetImportOrder,
    private readonly createOrder: CreateImportOrder,
    private readonly updateOrder: UpdateImportOrder,
    private readonly changeStatus: ChangeImportStatus,
    private readonly receiveOrder: ReceiveImportOrder,
    private readonly deleteOrder: DeleteImportOrder,
  ) {}

  @Get()
  list(@Query(new ZodValidationPipe(listImportOrdersSchema)) query: ListImportOrdersQuery) {
    const { page, pageSize, ...filters } = query;
    return this.listOrders.execute(filters, { page, pageSize });
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.getOrder.execute(id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createImportOrderSchema)) body: CreateImportOrderBody,
  ) {
    return this.createOrder.execute(body, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateImportOrderSchema)) body: UpdateImportOrderBody,
  ) {
    return this.updateOrder.execute(id, body);
  }

  @Post(':id/status')
  @HttpCode(200)
  status(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(changeStatusSchema)) body: ChangeStatusBody,
  ) {
    return this.changeStatus.execute(id, body.status);
  }

  @Post(':id/receive')
  @HttpCode(200)
  receive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(receiveImportOrderSchema)) body: ReceiveImportOrderBody,
  ) {
    return this.receiveOrder.execute(id, body, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.deleteOrder.execute(id);
  }
}
