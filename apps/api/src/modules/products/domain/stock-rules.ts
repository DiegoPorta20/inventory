import { BusinessRuleError } from '../../../shared/domain/errors.js';
import { stockStatusOf, type Product } from './product.js';

export class InsufficientStockError extends BusinessRuleError {
  constructor(available: number, requested: number) {
    super(
      'INSUFFICIENT_STOCK',
      `Insufficient stock: available ${available}, requested ${requested}`,
      {
        available,
        requested,
      },
    );
  }
}

export function stockAfter(product: Pick<Product, 'stock'>, delta: number): number {
  const next = product.stock + delta;
  if (next < 0) throw new InsufficientStockError(product.stock, -delta);
  return next;
}

export interface ReorderInput {
  stock: number;
  incomingQty: number;
  minStock: number;
  reorderQuantity: number;
}

export function suggestedReorderQuantity({
  stock,
  incomingQty,
  minStock,
  reorderQuantity,
}: ReorderInput): number {
  const available = stock + incomingQty;
  if (minStock <= 0 || available > minStock) return 0;
  return Math.max(minStock * 2 - available, reorderQuantity);
}

export const needsReorder = (input: ReorderInput): boolean => suggestedReorderQuantity(input) > 0;

export const isCritical = (product: Pick<Product, 'stock' | 'minStock'>): boolean =>
  stockStatusOf(product.stock, product.minStock) === 'OUT' && product.minStock > 0;
