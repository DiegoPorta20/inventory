import { Injectable } from '@nestjs/common';
import { UnauthorizedError } from '../../../../shared/domain/errors.js';
import { TenantContext } from '../../../../shared/infrastructure/tenant/tenant-context.js';
import { CompanyDirectory } from '../../../company-directory/application/ports/company-directory.js';
import { UserRepository } from '../../../users/application/ports/user.repository.js';
import { toPublicUser } from '../../../users/domain/user.js';
import { TokenService } from '../ports/token.service.js';
import { toAuthenticatedUser, type Session } from './login.js';

@Injectable()
export class RefreshSession {
  constructor(
    private readonly companies: CompanyDirectory,
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
    private readonly tenant: TenantContext,
  ) {}

  async execute(refreshToken: string | undefined): Promise<Session> {
    const claims = refreshToken ? await this.tokens.verifyRefresh(refreshToken) : null;
    if (!claims) throw new UnauthorizedError('Session expired');

    const company = await this.companies.findById(claims.companyId, { fresh: true });
    if (company?.status !== 'ACTIVE') throw new UnauthorizedError('Session expired');

    this.tenant.bind(company.id);
    const user = await this.users.findById(claims.userId);
    if (!user || !user.isActive) throw new UnauthorizedError('Session expired');
    return { user: toPublicUser(user), tokens: await this.tokens.issue(toAuthenticatedUser(user)) };
  }
}
