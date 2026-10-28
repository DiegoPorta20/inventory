import { Injectable } from '@nestjs/common';
import type { Role } from '../../../../shared/domain/auth.js';
import { ConflictError } from '../../../../shared/domain/errors.js';
import { normalizeEmail, toPublicUser, type PublicUser } from '../../domain/user.js';
import { PasswordHasher } from '../ports/password-hasher.js';
import { UserRepository } from '../ports/user.repository.js';

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: Role;
}

@Injectable()
export class CreateUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: CreateUserInput): Promise<PublicUser> {
    const email = normalizeEmail(input.email);
    if (await this.users.findByEmail(email)) {
      throw new ConflictError('A user with this email already exists');
    }
    const user = await this.users.create({
      email,
      name: input.name.trim(),
      role: input.role,
      passwordHash: await this.hasher.hash(input.password),
    });
    return toPublicUser(user);
  }
}
