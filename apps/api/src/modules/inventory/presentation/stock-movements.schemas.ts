import { z } from 'zod';
import {
  idParam,
  isoDate,
  optionalText,
  pageQueryShape,
} from '../../../shared/presentation/schema-helpers.js';
import { MOVEMENT_REASONS, MOVEMENT_TYPES } from '../domain/stock-movement.js';

const filterShape = {
  productId: idParam.optional(),
  type: z.enum(MOVEMENT_TYPES).optional(),
  reason: z.enum(MOVEMENT_REASONS).optional(),
  userId: idParam.optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  search: z.string().trim().max(100).optional(),
  referenceType: z.enum(['IMPORT_ORDER', 'STOCK_COUNT']).optional(),
  referenceId: idParam.optional(),
};

export const listMovementsSchema = z.object({ ...filterShape, ...pageQueryShape });
export const exportMovementsSchema = z.object(filterShape);

export const registerMovementSchema = z.strictObject({
  productId: z.number().int().positive(),
  type: z.enum(MOVEMENT_TYPES),
  reason: z.enum(MOVEMENT_REASONS),
  quantity: z.number().int().min(-10_000_000).max(10_000_000),
  unitPricePen: z.number().min(0).max(99_999_999).nullable().optional(),
  counterparty: optionalText(160),
  note: optionalText(500),
  occurredAt: z.coerce.date().optional(),
});

export type ListMovementsQuery = z.infer<typeof listMovementsSchema>;
export type ExportMovementsQuery = z.infer<typeof exportMovementsSchema>;
export type RegisterMovementBody = z.infer<typeof registerMovementSchema>;
