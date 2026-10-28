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
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe.js';
import {
  CreateSupplier,
  DeleteSupplier,
  GetSupplier,
  ListSuppliers,
  UpdateSupplier,
} from '../application/use-cases/supplier-use-cases.js';
import type { SupplierDraft } from '../domain/supplier.js';
import {
  createSupplierSchema,
  listSuppliersSchema,
  updateSupplierSchema,
  type CreateSupplierBody,
  type ListSuppliersQuery,
  type UpdateSupplierBody,
} from './suppliers.schemas.js';

@Controller('suppliers')
export class SuppliersController {
  constructor(
    private readonly listSuppliers: ListSuppliers,
    private readonly getSupplier: GetSupplier,
    private readonly createSupplier: CreateSupplier,
    private readonly updateSupplier: UpdateSupplier,
    private readonly deleteSupplier: DeleteSupplier,
  ) {}

  @Get()
  list(@Query(new ZodValidationPipe(listSuppliersSchema)) query: ListSuppliersQuery) {
    return this.listSuppliers.execute(query);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.getSupplier.execute(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createSupplierSchema)) body: CreateSupplierBody) {
    return this.createSupplier.execute(withDefaults(body));
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateSupplierSchema)) body: UpdateSupplierBody,
  ) {
    return this.updateSupplier.execute(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.deleteSupplier.execute(id);
  }
}

function withDefaults(body: CreateSupplierBody): SupplierDraft {
  return {
    name: body.name,
    country: body.country ?? null,
    contactName: body.contactName ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    notes: body.notes ?? null,
    isActive: body.isActive,
  };
}
