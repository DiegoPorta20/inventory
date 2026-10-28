import { Injectable } from '@nestjs/common';
import { UnauthorizedError } from '../../../../shared/domain/errors.js';
import { UserRepository } from '../../../users/application/ports/user.repository.js';
import { toPublicUser } from '../../../users/domain/user.js';
import { TokenService } from '../ports/token.service.js';
import { toAuthenticatedUser, type Session } from './login.js';

@Injectable()
export class RefreshSession {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
  ) {}

  async execute(refreshToken: string | undefined): Promise<Session> {
    const userId = refreshToken ? await this.tokens.verifyRefresh(refreshToken) : null;
    const user = userId ? await this.users.findById(userId) : null;
    if (!user || !user.isActive) throw new UnauthorizedError('Session expired');
    return { user: toPublicUser(user), tokens: await this.tokens.issue(toAuthenticatedUser(user)) };
  }
}
