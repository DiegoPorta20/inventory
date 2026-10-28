import { z } from 'zod';

export const loginSchema = z.strictObject({
  email: z.string().trim().email().max(190),
  password: z.string().min(1).max(128),
});

export const changePasswordSchema = z.strictObject({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export type LoginBody = z.infer<typeof loginSchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordSchema>;
