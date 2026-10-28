import { z } from 'zod';
import { optionalText, queryBoolean } from '../../../shared/presentation/schema-helpers.js';

const supplierShape = {
  name: z.string().trim().min(1).max(160),
  country: optionalText(80),
  contactName: optionalText(120),
  email: z
    .union([z.string().trim().email().max(190), z.literal('').transform(() => null)])
    .nullable()
    .optional(),
  phone: optionalText(40),
  notes: optionalText(2000),
  isActive: z.boolean().optional(),
};

export const createSupplierSchema = z.strictObject(supplierShape);
export const updateSupplierSchema = z.strictObject(supplierShape).partial();

export const listSuppliersSchema = z.object({
  search: z.string().trim().max(100).optional(),
  isActive: queryBoolean.optional(),
});

export type CreateSupplierBody = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierBody = z.infer<typeof updateSupplierSchema>;
export type ListSuppliersQuery = z.infer<typeof listSuppliersSchema>;
