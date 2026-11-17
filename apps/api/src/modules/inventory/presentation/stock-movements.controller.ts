import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import type { Access } from '../../../shared/domain/access.js';
import type { AuthenticatedUser } from '../../../shared/domain/auth.js';
import {
  CurrentAccess,
  CurrentUser,
  RequireAnyPermission,
  RequirePermission,
} from '../../../shared/presentation/decorators.js';
import { XLSX_CONTENT_TYPE } from '../../../shared/presentation/http.js';
import { assertMoneyWritable } from '../../../shared/presentation/money-guard.js';
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe.js';
import { RegisterStockMovement } from '../application/use-cases/register-stock-movement.js';
import {
  ExportStockMovements,
  SearchStockMovements,
} from '../application/use-cases/search-stock-movements.js';
import {
  exportMovementsSchema,
  listMovementsSchema,
  registerMovementSchema,
  type ExportMovementsQuery,
  type ListMovementsQuery,
  type RegisterMovementBody,
} from './stock-movements.schemas.js';

@Controller('stock-movements')
export class StockMovementsController {
  constructor(
    private readonly searchMovements: SearchStockMovements,
    private readonly exportMovements: ExportStockMovements,
    private readonly registerMovement: RegisterStockMovement,
  ) {}

  @Get()
  @RequireAnyPermission('movements.view', 'products.view')
  list(@Query(new ZodValidationPipe(listMovementsSchema)) query: ListMovementsQuery) {
    const { page, pageSize, ...filters } = query;
    return this.searchMovements.execute(filters, { page, pageSize });
  }

  @Get('export')
  @RequirePermission('movements.view')
  @Header('Content-Type', XLSX_CONTENT_TYPE)
  @Header('Content-Disposition', 'attachment; filename="movimientos.xlsx"')
  async export(@Query(new ZodValidationPipe(exportMovementsSchema)) query: ExportMovementsQuery) {
    return new StreamableFile(await this.exportMovements.execute(query));
  }

  @Post()
  @RequirePermission('movements.create')
  @HttpCode(201)
  register(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccess() access: Access,
    @Body(new ZodValidationPipe(registerMovementSchema)) body: RegisterMovementBody,
  ) {
    assertMoneyWritable(access, { prices: [body.unitPricePen] });
    return this.registerMovement.execute(body, user.id);
  }
}
