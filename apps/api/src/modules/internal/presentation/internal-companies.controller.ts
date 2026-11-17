import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { Public } from '../../../shared/presentation/decorators.js';
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe.js';
import { ProvisionCompanyAdmin } from '../application/provision-company-admin.js';
import { ServiceKeyGuard } from './service-key.guard.js';
import { provisionAdminSchema, type ProvisionAdminBody } from './internal.schemas.js';

/** Server-to-server API for config_inventory. Not reachable with a user session. */
@Controller('internal/companies')
@Public()
@UseGuards(ServiceKeyGuard)
export class InternalCompaniesController {
  constructor(private readonly provisionAdmin: ProvisionCompanyAdmin) {}

  @Post(':companyId/admins')
  createAdmin(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body(new ZodValidationPipe(provisionAdminSchema)) body: ProvisionAdminBody,
  ) {
    return this.provisionAdmin.execute(companyId, body);
  }
}
