import { z } from 'zod';
import { UNITS } from '../domain/product.js';
import {
  optionalText,
  pageQueryShape,
  queryBoolean,
  sortDirection,
} from '../../../shared/presentation/schema-helpers.js';

const positiveInt = z.coerce.number().int().positive();
const money = z.number().min(0).max(99_999_999).nullable().optional();
const quantity = z.number().int().min(0).max(10_000_000);

export const listProductsSchema = z.object({
  search: z.string().trim().max(100).optional(),
  categoryId: positiveInt.optional(),
  unit: z.enum(UNITS).optional(),
  stockStatus: z.enum(['OUT', 'LOW', 'OK', 'UNCONFIGURED']).optional(),
  importOrderId: positiveInt.optional(),
  equipmentId: positiveInt.optional(),
  isActive: queryBoolean.optional(),
  isInternalCode: queryBoolean.optional(),
  costCenterId: positiveInt.optional(),
  isConsignment: queryBoolean.optional(),
  hasPrice: queryBoolean.optional(),
  sortBy: z.enum(['code', 'name', 'stock', 'updatedAt', 'cost', 'price']).default('name'),
  sortDirection,
  ...pageQueryShape,
});

export const exportProductsSchema = listProductsSchema.omit({ page: true, pageSize: true });

const productShape = {
  code: z.string().trim().min(1).max(60).optional(),
  name: z.string().trim().min(1).max(255),
  description: optionalText(4000),
  specification: optionalText(500),
  categoryId: z.number().int().positive().nullable().optional(),
  costCenterId: z.number().int().positive().nullable().optional(),
  unit: z.enum(UNITS),
  minStock: quantity.optional(),
  reorderQuantity: quantity.optional(),
  location: optionalText(60),
  costPen: money,
  pricePen: money,
  wholesalePricePen: money,
  wholesaleMinQty: z.number().int().min(1).max(10_000_000).nullable().optional(),
  isConsignment: z.boolean().optional(),
  notes: optionalText(4000),
  isActive: z.boolean().optional(),
  equipmentIds: z.array(z.number().int().positive()).max(100).optional(),
};

export const createProductSchema = z.strictObject({
  ...productShape,
  unit: z.enum(UNITS).default('PCS'),
});
export const updateProductSchema = z.strictObject(productShape).partial();

export const bulkUpdateProductsSchema = z.strictObject({
  ids: z.array(z.number().int().positive()).min(1).max(1000),
  changes: z.strictObject({
    categoryId: z.number().int().positive().nullable().optional(),
    costCenterId: z.number().int().positive().nullable().optional(),
    minStock: quantity.optional(),
    reorderQuantity: quantity.optional(),
    isActive: z.boolean().optional(),
  }),
});

export type ListProductsQuery = z.infer<typeof listProductsSchema>;
export type ExportProductsQuery = z.infer<typeof exportProductsSchema>;
export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
export type BulkUpdateProductsBody = z.infer<typeof bulkUpdateProductsSchema>;
