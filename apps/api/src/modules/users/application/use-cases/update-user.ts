import { Injectable } from '@nestjs/common';
import type { Role } from '../../../../shared/domain/auth.js';
import { BusinessRuleError, NotFoundError } from '../../../../shared/domain/errors.js';
import { toPublicUser, type PublicUser } from '../../domain/user.js';
import { PasswordHasher } from '../ports/password-hasher.js';
import { UserRepository, type UserChanges } from '../ports/user.repository.js';

export interface UpdateUserInput {
  name?: string;
  role?: Role;
  isActive?: boolean;
  password?: string;
}

@Injectable()
export class UpdateUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(actorId: number, id: number, input: UpdateUserInput): Promise<PublicUser> {
    const existing = await this.users.findById(id);
    if (!existing) throw new NotFoundError('User', id);

    if (
      actorId === id &&
      (input.isActive === false || (input.role && input.role !== existing.role))
    ) {
      throw new BusinessRuleError(
        'CANNOT_MODIFY_SELF',
        'You cannot deactivate or change your own role',
      );
    }

    const changes: UserChanges = {
      name: input.name?.trim(),
      role: input.role,
      isActive: input.isActive,
      passwordHash: input.password ? await this.hasher.hash(input.password) : undefined,
    };
    return toPublicUser(await this.users.update(id, changes));
  }
}
