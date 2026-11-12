import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { ProvisionCompanyAdmin } from './application/provision-company-admin.js';
import { InternalCompaniesController } from './presentation/internal-companies.controller.js';
import { ServiceKeyGuard } from './presentation/service-key.guard.js';

@Module({
  imports: [UsersModule],
  controllers: [InternalCompaniesController],
  providers: [ProvisionCompanyAdmin, ServiceKeyGuard],
})
export class InternalModule {}
