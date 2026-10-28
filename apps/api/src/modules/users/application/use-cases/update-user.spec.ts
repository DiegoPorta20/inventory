import { describe, expect, it } from 'vitest';
import { Role } from '../../../../shared/domain/auth.js';
import { PasswordHasher } from '../ports/password-hasher.js';
import { UserRepository, type UserChanges } from '../ports/user.repository.js';
import type { User } from '../../domain/user.js';
import { UpdateUser } from './update-user.js';

class InMemoryUsers extends UserRepository {
  constructor(private readonly store: User[]) {
    super();
  }
  findAll = async () => this.store;
  findById = async (id: number) => this.store.find((user) => user.id === id) ?? null;
  findByEmail = async (email: string) => this.store.find((user) => user.email === email) ?? null;
  create = async () => this.store[0] as User;
  recordLogin = async () => undefined;
  update = async (id: number, changes: UserChanges) => {
    const user = this.store.find((candidate) => candidate.id === id) as User;
    Object.assign(
      user,
      Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined)),
    );
    return user;
  };
}

class FakeHasher extends PasswordHasher {
  hash = async (plain: string) => `hashed:${plain}`;
  verify = async (plain: string, hash: string) => hash === `hashed:${plain}`;
}

const aUser = (overrides: Partial<User> = {}): User => ({
  id: 1,
  email: 'a@x.com',
  name: 'A',
  passwordHash: 'h',
  role: Role.ADMIN,
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('UpdateUser', () => {
  it('prevents users from deactivating themselves', async () => {
    const useCase = new UpdateUser(new InMemoryUsers([aUser()]), new FakeHasher());
    await expect(useCase.execute(1, 1, { isActive: false })).rejects.toMatchObject({
      code: 'CANNOT_MODIFY_SELF',
    });
  });

  it('lets an admin deactivate another user and reset their password', async () => {
    const users = new InMemoryUsers([aUser(), aUser({ id: 2, email: 'b@x.com' })]);
    const result = await new UpdateUser(users, new FakeHasher()).execute(1, 2, {
      isActive: false,
      password: 'newSecret1',
    });
    expect(result.isActive).toBe(false);
    expect((await users.findById(2))?.passwordHash).toBe('hashed:newSecret1');
    expect('passwordHash' in result).toBe(false);
  });
});
