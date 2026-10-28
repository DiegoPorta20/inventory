import { z } from 'zod';
import {
  idParam,
  optionalText,
  pageQueryShape,
  queryBoolean,
} from '../../../shared/presentation/schema-helpers.js';

export const createStockCountSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  categoryId: z.number().int().positive().nullable().optional(),
  note: optionalText(500),
});

export const listStockCountsSchema = z.object({
  status: z.enum(['OPEN', 'COMPLETED', 'CANCELLED']).optional(),
  categoryId: idParam.optional(),
  ...pageQueryShape,
});

export const listCountItemsSchema = z.object({
  search: z.string().trim().max(100).optional(),
  onlyDifferences: queryBoolean.optional(),
  onlyPending: queryBoolean.optional(),
  ...pageQueryShape,
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const recordCountSchema = z.strictObject({
  countedQty: z.number().int().min(0).max(10_000_000).nullable(),
  note: optionalText(255),
});

export type CreateStockCountBody = z.infer<typeof createStockCountSchema>;
export type ListStockCountsQuery = z.infer<typeof listStockCountsSchema>;
export type ListCountItemsQuery = z.infer<typeof listCountItemsSchema>;
export type RecordCountBody = z.infer<typeof recordCountSchema>;
