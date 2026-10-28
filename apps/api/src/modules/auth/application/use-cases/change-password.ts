import { Injectable } from '@nestjs/common';
import { BusinessRuleError, NotFoundError } from '../../../../shared/domain/errors.js';
import { PasswordHasher } from '../../../users/application/ports/password-hasher.js';
import { UserRepository } from '../../../users/application/ports/user.repository.js';

@Injectable()
export class ChangePassword {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(
    userId: number,
    input: { currentPassword: string; newPassword: string },
  ): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('User', userId);
    if (!(await this.hasher.verify(input.currentPassword, user.passwordHash))) {
      throw new BusinessRuleError('INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
    }
    await this.users.update(userId, { passwordHash: await this.hasher.hash(input.newPassword) });
  }
}
