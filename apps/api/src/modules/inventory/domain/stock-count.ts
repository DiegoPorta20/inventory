import { BusinessRuleError } from '../../../shared/domain/errors.js';

export type StockCountStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED';

export interface StockCount {
  id: number;
  name: string;
  status: StockCountStatus;
  categoryId: number | null;
  categoryName: string | null;
  note: string | null;
  createdBy: number | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface StockCountSummary {
  itemsTotal: number;
  itemsCounted: number;
  itemsWithDifference: number;
  netDifference: number;
}

export interface StockCountItem {
  id: number;
  stockCountId: number;
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  categoryName: string | null;
  systemQty: number;
  countedQty: number | null;
  difference: number | null;
  note: string | null;
}

export const differenceOf = (systemQty: number, countedQty: number | null): number | null =>
  countedQty === null ? null : countedQty - systemQty;

export function assertOpen(count: Pick<StockCount, 'status'>): void {
  if (count.status !== 'OPEN') {
    throw new BusinessRuleError(
      'STOCK_COUNT_CLOSED',
      `Stock count is ${count.status.toLowerCase()} and cannot be modified`,
    );
  }
}
