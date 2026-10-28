import type { Role } from '../../../shared/domain/auth.js';

export interface User {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PublicUser = Omit<User, 'passwordHash'>;

export function toPublicUser({ passwordHash: _omitted, ...user }: User): PublicUser {
  return user;
}

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();
