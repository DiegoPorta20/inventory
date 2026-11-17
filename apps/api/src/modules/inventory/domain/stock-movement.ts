import { BusinessRuleError } from '../../../shared/domain/errors.js';

export const MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUSTMENT'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_REASONS = [
  'IMPORT_RECEIPT',
  'CUSTOMER_RETURN',
  'INITIAL_LOAD',
  'SALE',
  'SUPPLIER_RETURN',
  'DAMAGE',
  'INTERNAL_USE',
  'COUNT_ADJUSTMENT',
  'CORRECTION',
  'OTHER',
] as const;
export type MovementReason = (typeof MOVEMENT_REASONS)[number];

export const MANUAL_REASONS_BY_TYPE: Record<MovementType, readonly MovementReason[]> = {
  IN: ['CUSTOMER_RETURN', 'INITIAL_LOAD', 'OTHER'],
  OUT: ['SALE', 'SUPPLIER_RETURN', 'DAMAGE', 'INTERNAL_USE', 'OTHER'],
  ADJUSTMENT: ['CORRECTION'],
};

export type ReferenceType = 'IMPORT_ORDER' | 'STOCK_COUNT';

export interface StockMovement {
  id: number;
  productId: number;
  type: MovementType;
  reason: MovementReason;
  quantity: number;
  stockAfter: number;
  unitPricePen: number | null;
  counterparty: string | null;
  referenceType: ReferenceType | null;
  referenceId: number | null;
  note: string | null;
  userId: number | null;
  occurredAt: Date;
  createdAt: Date;
}

export interface StockMovementView extends StockMovement {
  productCode: string;
  productName: string;
  unit: string;
  userName: string | null;
}

export function assertManualReason(type: MovementType, reason: MovementReason): void {
  if (!MANUAL_REASONS_BY_TYPE[type].includes(reason)) {
    throw new BusinessRuleError(
      'INVALID_MOVEMENT_REASON',
      `Reason ${reason} is not allowed for ${type} movements`,
    );
  }
}

export function signedDelta(type: MovementType, quantity: number): number {
  if (!Number.isInteger(quantity) || quantity === 0) {
    throw new BusinessRuleError('INVALID_QUANTITY', 'Quantity must be a non-zero integer');
  }
  if (type === 'ADJUSTMENT') return quantity;
  if (quantity < 0) throw new BusinessRuleError('INVALID_QUANTITY', 'Quantity must be positive');
  return type === 'IN' ? quantity : -quantity;
}
