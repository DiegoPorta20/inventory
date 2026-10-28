import { z } from 'zod';
import { Role } from '../../../shared/domain/auth.js';

const password = z.string().min(8).max(128);

export const createUserSchema = z.strictObject({
  email: z.string().trim().email().max(190),
  name: z.string().trim().min(1).max(120),
  password,
  role: z.enum(Role).default(Role.ADMIN),
});

export const updateUserSchema = z.strictObject({
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(Role).optional(),
  isActive: z.boolean().optional(),
  password: password.optional(),
});

export type CreateUserBody = z.infer<typeof createUserSchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;
