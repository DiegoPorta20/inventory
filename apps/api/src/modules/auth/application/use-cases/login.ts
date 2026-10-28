import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../shared/domain/auth.js';
import { UnauthorizedError } from '../../../../shared/domain/errors.js';
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
  email: user.email,
  name: user.name,
  role: user.role,
});

@Injectable()
export class Login {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async execute(input: { email: string; password: string }): Promise<Session> {
    const user = await this.users.findByEmail(normalizeEmail(input.email));
    if (!user) {
      await this.hasher.hash(input.password);
      throw new UnauthorizedError('Invalid email or password');
    }
    const valid = await this.hasher.verify(input.password, user.passwordHash);
    if (!valid || !user.isActive) throw new UnauthorizedError('Invalid email or password');

    await this.users.recordLogin(user.id, new Date());
    return { user: toPublicUser(user), tokens: await this.tokens.issue(toAuthenticatedUser(user)) };
  }
}
