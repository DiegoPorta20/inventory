import { z } from 'zod';

export const createCategorySchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  parentId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryBody = z.infer<typeof createCategorySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>;
