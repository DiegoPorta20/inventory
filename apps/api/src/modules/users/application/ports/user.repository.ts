import type { Role } from '../../../../shared/domain/auth.js';
import type { User } from '../../domain/user.js';

export interface NewUser {
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
}

export interface UserChanges {
  name?: string;
  role?: Role;
  isActive?: boolean;
  passwordHash?: string;
}

export abstract class UserRepository {
  abstract findAll(): Promise<User[]>;
  abstract findById(id: number): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract create(user: NewUser): Promise<User>;
  abstract update(id: number, changes: UserChanges): Promise<User>;
  abstract recordLogin(id: number, at: Date): Promise<void>;
}
