import { z } from 'zod';

export const provisionAdminSchema = z.strictObject({
  email: z.string().trim().email().max(190),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(128),
});

export type ProvisionAdminBody = z.infer<typeof provisionAdminSchema>;
