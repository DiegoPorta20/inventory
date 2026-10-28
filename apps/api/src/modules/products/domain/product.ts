export const UNITS = ['UNIT', 'PCS', 'SET'] as const;
export type UnitOfMeasure = (typeof UNITS)[number];

export type StockStatus = 'OUT' | 'LOW' | 'OK';

export interface Product {
  id: number;
  code: string;
  isInternalCode: boolean;
  name: string;
  description: string | null;
  specification: string | null;
  categoryId: number | null;
  costCenterId: number | null;
  unit: UnitOfMeasure;
  stock: number;
  minStock: number;
  reorderQuantity: number;
  location: string | null;
  costUsd: number | null;
  /** Sale price in USD without IGV. */
  priceUsd: number | null;
  wholesalePriceUsd: number | null;
  wholesaleMinQty: number | null;
  isConsignment: boolean;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductListItem extends Product {
  categoryName: string | null;
  costCenterName: string | null;
  stockStatus: StockStatus;
  incomingQty: number;
}

export const normalizeProductCode = (code: string): string =>
  code.replace(/\s+/g, '').toUpperCase();

export const normalizeProductName = (name: string): string => name.replace(/\s+/g, ' ').trim();

export function stockStatusOf(stock: number, minStock: number): StockStatus {
  if (stock <= 0) return 'OUT';
  if (minStock > 0 && stock <= minStock) return 'LOW';
  return 'OK';
}

export function formatInternalCode(sequence: number): string {
  return `INT-${String(sequence).padStart(4, '0')}`;
}
