import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../shared/domain/auth.js';
import { ForbiddenError, UnauthorizedError } from '../../../../shared/domain/errors.js';
import { TenantContext } from '../../../../shared/infrastructure/tenant/tenant-context.js';
import { CompanyDirectory } from '../../../company-directory/application/ports/company-directory.js';
import { normalizeSlug } from '../../../company-directory/domain/company-profile.js';
import { PasswordHasher } from '../../../users/application/ports/password-hasher.js';
import { UserRepository } from '../../../users/application/ports/user.repository.js';
import {
  normalizeEmail,
  toPublicUser,
  type PublicUser,
  type User,
} from '../../../users/domain/user.js';
import { TokenService, type TokenPair } from '../ports/token.service.js';

export interface Session {
  user: PublicUser;
  tokens: TokenPair;
}

export const toAuthenticatedUser = (user: User): AuthenticatedUser => ({
  id: user.id,
  companyId: user.companyId,
  email: user.email,
  name: user.name,
  role: user.role,
});

const INVALID_CREDENTIALS = 'Invalid company, email or password';

@Injectable()
export class Login {
  constructor(
    private readonly companies: CompanyDirectory,
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly tenant: TenantContext,
  ) {}

  async execute(input: { company: string; email: string; password: string }): Promise<Session> {
    const company = await this.companies.findBySlug(normalizeSlug(input.company), {
      fresh: true,
    });
    if (!company) {
      await this.hasher.hash(input.password);
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }

    this.tenant.bind(company.id);
    const user = await this.users.findByEmail(normalizeEmail(input.email));
    if (!user) {
      await this.hasher.hash(input.password);
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }
    const valid = await this.hasher.verify(input.password, user.passwordHash);
    if (!valid || !user.isActive) throw new UnauthorizedError(INVALID_CREDENTIALS);
    if (company.status !== 'ACTIVE') throw new ForbiddenError('This company is suspended');

    await this.users.recordLogin(user.id, new Date());
    return { user: toPublicUser(user), tokens: await this.tokens.issue(toAuthenticatedUser(user)) };
  }
}
