import { Injectable } from '@nestjs/common';
import { BusinessRuleError } from '../../../shared/domain/errors.js';
import { TenantContext } from '../../../shared/infrastructure/tenant/tenant-context.js';
import { CompanyDirectory } from '../../company-directory/application/ports/company-directory.js';
import { UserRepository } from './ports/user.repository.js';

/** Enforces the user limit config_inventory sets for the current company. */
@Injectable()
export class UserLimit {
  constructor(
    private readonly users: UserRepository,
    private readonly directory: CompanyDirectory,
    private readonly tenant: TenantContext,
  ) {}

  /** Throws when one more active user would exceed the company's limit. */
  async assertCanAddActiveUser(): Promise<void> {
    const company = await this.directory.findById(this.tenant.companyId, { fresh: true });
    const max = company?.config.limits.maxUsers ?? null;
    if (max === null) return;
    if ((await this.users.countActive()) >= max) {
      throw new BusinessRuleError(
        'USER_LIMIT_REACHED',
        `The company reached its limit of ${max} active users`,
        { maxUsers: max },
      );
    }
  }
}
