import { Injectable } from '@nestjs/common';
import { Role } from '../../../shared/domain/auth.js';
import { NotFoundError } from '../../../shared/domain/errors.js';
import { TenantContext } from '../../../shared/infrastructure/tenant/tenant-context.js';
import { CompanyDirectory } from '../../company-directory/application/ports/company-directory.js';
import { CreateUser } from '../../users/application/use-cases/create-user.js';
import type { PublicUser } from '../../users/domain/user.js';

@Injectable()
export class ProvisionCompanyAdmin {
  constructor(
    private readonly directory: CompanyDirectory,
    private readonly createUser: CreateUser,
    private readonly tenant: TenantContext,
  ) {}

  /** Creates an administrator inside a company that config_inventory knows about. */
  async execute(
    companyId: number,
    input: { email: string; name: string; password: string },
  ): Promise<PublicUser> {
    if (!(await this.directory.findById(companyId, { fresh: true })))
      throw new NotFoundError('Company', companyId);
    this.tenant.bind(companyId);
    return this.createUser.execute({ ...input, role: Role.ADMIN });
  }
}
