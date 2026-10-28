import { BusinessRuleError } from '../../../shared/domain/errors.js';

export const IMPORT_STATUSES = ['DRAFT', 'ORDERED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

export interface ImportOrder {
  id: number;
  number: number;
  supplierId: number | null;
  supplierName: string | null;
  status: ImportStatus;
  reference: string | null;
  orderedAt: string | null;
  expectedAt: string | null;
  receivedAt: string | null;
  exchangeRate: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportOrderSummary extends ImportOrder {
  itemCount: number;
  totalOrdered: number;
  totalReceived: number;
  totalCostUsd: number;
}

export interface ImportOrderItem {
  id: number;
  importOrderId: number;
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCostUsd: number | null;
  notes: string | null;
}

export interface ImportOrderDetail extends ImportOrderSummary {
  items: ImportOrderItem[];
}

const MANUAL_TRANSITIONS: Record<ImportStatus, readonly ImportStatus[]> = {
  DRAFT: ['ORDERED', 'CANCELLED'],
  ORDERED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['CANCELLED'],
  RECEIVED: [],
  CANCELLED: [],
};

const RECEIVABLE: readonly ImportStatus[] = ['DRAFT', 'ORDERED', 'IN_TRANSIT'];

export const isEditable = (status: ImportStatus): boolean => RECEIVABLE.includes(status);

export function assertEditable(order: Pick<ImportOrder, 'status' | 'number'>): void {
  if (!isEditable(order.status)) {
    throw new BusinessRuleError(
      'IMPORT_NOT_EDITABLE',
      `Import #${order.number} is ${order.status} and cannot be modified`,
    );
  }
}

export function assertTransition(
  order: Pick<ImportOrder, 'status' | 'number'>,
  next: ImportStatus,
): void {
  if (!MANUAL_TRANSITIONS[order.status].includes(next)) {
    throw new BusinessRuleError(
      'INVALID_IMPORT_TRANSITION',
      `Import #${order.number} cannot move from ${order.status} to ${next}`,
    );
  }
}

export function assertReceivable(order: Pick<ImportOrder, 'status' | 'number'>): void {
  if (!RECEIVABLE.includes(order.status)) {
    throw new BusinessRuleError(
      'IMPORT_NOT_RECEIVABLE',
      `Import #${order.number} is ${order.status} and cannot be received`,
    );
  }
}
