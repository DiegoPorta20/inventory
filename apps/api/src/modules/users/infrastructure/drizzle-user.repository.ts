import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Role } from '../../../shared/domain/auth.js';
import { ConflictError, NotFoundError } from '../../../shared/domain/errors.js';
import { DatabaseService } from '../../../shared/infrastructure/database/database.service.js';
import { isDuplicateEntry } from '../../../shared/infrastructure/database/mysql-errors.js';
import { users } from '../../../shared/infrastructure/database/schema.js';
import {
  UserRepository,
  type NewUser,
  type UserChanges,
} from '../application/ports/user.repository.js';
import type { User } from '../domain/user.js';

type UserRow = typeof users.$inferSelect;

const toUser = (row: UserRow): User => ({ ...row, role: row.role as Role });

@Injectable()
export class DrizzleUserRepository extends UserRepository {
  constructor(private readonly database: DatabaseService) {
    super();
  }

  async findAll(): Promise<User[]> {
    const rows = await this.database.db.select().from(users).orderBy(users.name);
    return rows.map(toUser);
  }

  async findById(id: number): Promise<User | null> {
    const [row] = await this.database.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? toUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return row ? toUser(row) : null;
  }

  async create(user: NewUser): Promise<User> {
    try {
      const [result] = await this.database.db.insert(users).values(user);
      return this.requireById(result.insertId);
    } catch (error) {
      if (isDuplicateEntry(error)) throw new ConflictError('A user with this email already exists');
      throw error;
    }
  }

  async update(id: number, changes: UserChanges): Promise<User> {
    const values = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
    if (Object.keys(values).length > 0) {
      await this.database.db.update(users).set(values).where(eq(users.id, id));
    }
    return this.requireById(id);
  }

  async recordLogin(id: number, at: Date): Promise<void> {
    await this.database.db.update(users).set({ lastLoginAt: at }).where(eq(users.id, id));
  }

  private async requireById(id: number): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundError('User', id);
    return user;
  }
}
