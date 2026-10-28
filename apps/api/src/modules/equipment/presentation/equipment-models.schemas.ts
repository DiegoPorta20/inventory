import { z } from 'zod';
import { optionalText } from '../../../shared/presentation/schema-helpers.js';

const shape = {
  name: z.string().trim().min(1).max(160),
  brand: optionalText(80),
  description: optionalText(2000),
};

export const createEquipmentModelSchema = z.strictObject(shape);
export const updateEquipmentModelSchema = z.strictObject(shape).partial();
export const listEquipmentModelsSchema = z.object({
  search: z.string().trim().max(100).optional(),
});

export type CreateEquipmentModelBody = z.infer<typeof createEquipmentModelSchema>;
export type UpdateEquipmentModelBody = z.infer<typeof updateEquipmentModelSchema>;
export type ListEquipmentModelsQuery = z.infer<typeof listEquipmentModelsSchema>;
