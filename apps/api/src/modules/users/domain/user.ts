import type { Role } from '../../../shared/domain/auth.js';

export interface User {
  id: number;
  companyId: number;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PublicUser = Omit<User, 'passwordHash' | 'companyId'>;

export function toPublicUser({
  passwordHash: _passwordHash,
  companyId: _companyId,
  ...user
}: User): PublicUser {
  return user;
}

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();
