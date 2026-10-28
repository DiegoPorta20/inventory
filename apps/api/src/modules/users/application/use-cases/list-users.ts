import { Injectable } from '@nestjs/common';
import type { PublicUser } from '../../domain/user.js';
import { toPublicUser } from '../../domain/user.js';
import { UserRepository } from '../ports/user.repository.js';

@Injectable()
export class ListUsers {
  constructor(private readonly users: UserRepository) {}

  async execute(): Promise<PublicUser[]> {
    return (await this.users.findAll()).map(toPublicUser);
  }
}
