import { Injectable } from '@nestjs/common';
import { UnauthorizedError } from '../../../../shared/domain/errors.js';
import { UserRepository } from '../../../users/application/ports/user.repository.js';
import { toPublicUser, type PublicUser } from '../../../users/domain/user.js';

@Injectable()
export class GetCurrentUser {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: number): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user || !user.isActive) throw new UnauthorizedError('Session expired');
    return toPublicUser(user);
  }
}
