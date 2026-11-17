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
import type { Access } from '../../../shared/domain/access.js';
import type { AuthenticatedUser } from '../../../shared/domain/auth.js';
import {
  CurrentAccess,
  CurrentUser,
  RequirePermission,
} from '../../../shared/presentation/decorators.js';
import { assertMoneyWritable } from '../../../shared/presentation/money-guard.js';
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
  @RequirePermission('imports.view')
  list(@Query(new ZodValidationPipe(listImportOrdersSchema)) query: ListImportOrdersQuery) {
    const { page, pageSize, ...filters } = query;
    return this.listOrders.execute(filters, { page, pageSize });
  }

  @Get(':id')
  @RequirePermission('imports.view')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.getOrder.execute(id);
  }

  @Post()
  @RequirePermission('imports.create')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccess() access: Access,
    @Body(new ZodValidationPipe(createImportOrderSchema)) body: CreateImportOrderBody,
  ) {
    assertMoneyWritable(access, {
      costs: body.items.map((item) => item.unitCostPen).filter((cost) => cost !== null),
    });
    return this.createOrder.execute(body, user.id);
  }

  @Patch(':id')
  @RequirePermission('imports.update')
  update(
    @CurrentAccess() access: Access,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateImportOrderSchema)) body: UpdateImportOrderBody,
  ) {
    // Replacing the lines would erase unit costs the user cannot see, so it needs that permission.
    if (body.items !== undefined) access.requireCosts();
    return this.updateOrder.execute(id, body);
  }

  @Post(':id/status')
  @RequirePermission('imports.update')
  @HttpCode(200)
  status(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(changeStatusSchema)) body: ChangeStatusBody,
  ) {
    return this.changeStatus.execute(id, body.status);
  }

  @Post(':id/receive')
  @RequirePermission('imports.receive')
  @HttpCode(200)
  receive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(receiveImportOrderSchema)) body: ReceiveImportOrderBody,
  ) {
    return this.receiveOrder.execute(id, body, user.id);
  }

  @Delete(':id')
  @RequirePermission('imports.delete')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.deleteOrder.execute(id);
  }
}
