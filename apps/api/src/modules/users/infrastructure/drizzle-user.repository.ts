import { Injectable } from '@nestjs/common';
import { and, count, eq } from 'drizzle-orm';
import { Role } from '../../../shared/domain/auth.js';
import { ConflictError, NotFoundError } from '../../../shared/domain/errors.js';
import { DatabaseService } from '../../../shared/infrastructure/database/database.service.js';
import { isDuplicateEntry } from '../../../shared/infrastructure/database/mysql-errors.js';
import { users } from '../../../shared/infrastructure/database/schema.js';
import { TenantContext } from '../../../shared/infrastructure/tenant/tenant-context.js';
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
  constructor(
    private readonly database: DatabaseService,
    private readonly tenant: TenantContext,
  ) {
    super();
  }

  private get inCompany() {
    return eq(users.companyId, this.tenant.companyId);
  }

  async findAll(): Promise<User[]> {
    const rows = await this.database.db
      .select()
      .from(users)
      .where(this.inCompany)
      .orderBy(users.name);
    return rows.map(toUser);
  }

  async findById(id: number): Promise<User | null> {
    const [row] = await this.database.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), this.inCompany))
      .limit(1);
    return row ? toUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.database.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), this.inCompany))
      .limit(1);
    return row ? toUser(row) : null;
  }

  async countActive(): Promise<number> {
    const [row] = await this.database.db
      .select({ value: count() })
      .from(users)
      .where(and(this.inCompany, eq(users.isActive, true)));
    return Number(row?.value ?? 0);
  }

  async create(user: NewUser): Promise<User> {
    try {
      const [result] = await this.database.db
        .insert(users)
        .values({ ...user, companyId: this.tenant.companyId });
      return this.requireById(result.insertId);
    } catch (error) {
      if (isDuplicateEntry(error)) throw new ConflictError('A user with this email already exists');
      throw error;
    }
  }

  async update(id: number, changes: UserChanges): Promise<User> {
    const values = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
    if (Object.keys(values).length > 0) {
      await this.database.db
        .update(users)
        .set(values)
        .where(and(eq(users.id, id), this.inCompany));
    }
    return this.requireById(id);
  }

  async recordLogin(id: number, at: Date): Promise<void> {
    await this.database.db
      .update(users)
      .set({ lastLoginAt: at })
      .where(and(eq(users.id, id), this.inCompany));
  }

  private async requireById(id: number): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundError('User', id);
    return user;
  }
}
