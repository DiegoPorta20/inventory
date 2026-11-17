import { z } from 'zod';
import {
  idParam,
  isoDate,
  optionalText,
  pageQueryShape,
} from '../../../shared/presentation/schema-helpers.js';
import { IMPORT_STATUSES } from '../domain/import-order.js';

const itemSchema = z.strictObject({
  productId: z.number().int().positive(),
  quantityOrdered: z.number().int().min(1).max(10_000_000),
  unitCostPen: z
    .number()
    .min(0)
    .max(99_999_999)
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  notes: optionalText(255).transform((v) => v ?? null),
});

const orderShape = {
  number: z.number().int().positive().optional(),
  supplierId: z.number().int().positive().nullable().optional(),
  reference: optionalText(120),
  orderedAt: isoDate.nullable().optional(),
  expectedAt: isoDate.nullable().optional(),
  notes: optionalText(4000),
  items: z.array(itemSchema).min(1).max(1000),
};

export const createImportOrderSchema = z.strictObject({
  ...orderShape,
  status: z.enum(['DRAFT', 'ORDERED']).optional(),
});

export const updateImportOrderSchema = z.strictObject(orderShape).partial();

export const changeStatusSchema = z.strictObject({
  status: z.enum(IMPORT_STATUSES),
});

export const receiveImportOrderSchema = z.strictObject({
  receivedAt: isoDate.optional(),
  lines: z
    .array(
      z.strictObject({
        itemId: z.number().int().positive(),
        quantityReceived: z.number().int().min(0).max(10_000_000),
      }),
    )
    .max(1000)
    .optional(),
});

export const listImportOrdersSchema = z.object({
  status: z.enum(IMPORT_STATUSES).optional(),
  supplierId: idParam.optional(),
  productId: idParam.optional(),
  search: z.string().trim().max(100).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  ...pageQueryShape,
});

export type CreateImportOrderBody = z.infer<typeof createImportOrderSchema>;
export type UpdateImportOrderBody = z.infer<typeof updateImportOrderSchema>;
export type ChangeStatusBody = z.infer<typeof changeStatusSchema>;
export type ReceiveImportOrderBody = z.infer<typeof receiveImportOrderSchema>;
export type ListImportOrdersQuery = z.infer<typeof listImportOrdersSchema>;
