import type {
  ImportStatus,
  MovementReason,
  MovementType,
  StockCountStatus,
  StockStatus,
  UnitOfMeasure,
} from './models';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

export const UNIT_LABELS: Record<UnitOfMeasure, string> = {
  UNIT: 'Unid.',
  PCS: 'Pzas.',
  SET: 'Set',
};

export const STOCK_STATUS_LABELS: Record<StockStatus | 'UNCONFIGURED', string> = {
  OUT: 'Sin stock',
  LOW: 'Stock bajo',
  OK: 'Stock OK',
  UNCONFIGURED: 'Sin mínimo configurado',
};

export const STOCK_STATUS_TONES: Record<StockStatus, Tone> = {
  OUT: 'danger',
  LOW: 'warning',
  OK: 'success',
};

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  IN: 'Entrada',
  OUT: 'Salida',
  ADJUSTMENT: 'Ajuste',
};

export const MOVEMENT_TYPE_TONES: Record<MovementType, Tone> = {
  IN: 'success',
  OUT: 'danger',
  ADJUSTMENT: 'info',
};

export const MOVEMENT_REASON_LABELS: Record<MovementReason, string> = {
  IMPORT_RECEIPT: 'Recepción de importación',
  CUSTOMER_RETURN: 'Devolución de cliente',
  INITIAL_LOAD: 'Carga inicial',
  SALE: 'Venta',
  SUPPLIER_RETURN: 'Devolución a proveedor',
  DAMAGE: 'Merma / daño',
  INTERNAL_USE: 'Uso interno',
  COUNT_ADJUSTMENT: 'Ajuste por conteo',
  CORRECTION: 'Corrección',
  OTHER: 'Otro',
};

export const MANUAL_REASONS: Record<MovementType, MovementReason[]> = {
  IN: ['CUSTOMER_RETURN', 'INITIAL_LOAD', 'OTHER'],
  OUT: ['SALE', 'SUPPLIER_RETURN', 'DAMAGE', 'INTERNAL_USE', 'OTHER'],
  ADJUSTMENT: ['CORRECTION'],
};

export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  DRAFT: 'Borrador',
  ORDERED: 'Pedido',
  IN_TRANSIT: 'En tránsito',
  RECEIVED: 'Recibido',
  CANCELLED: 'Cancelado',
};

export const IMPORT_STATUS_TONES: Record<ImportStatus, Tone> = {
  DRAFT: 'neutral',
  ORDERED: 'info',
  IN_TRANSIT: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'danger',
};

export const COUNT_STATUS_LABELS: Record<StockCountStatus, string> = {
  OPEN: 'En curso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

export const COUNT_STATUS_TONES: Record<StockCountStatus, Tone> = {
  OPEN: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
};

export const entries = <K extends string>(
  labels: Record<K, string>,
): { value: K; label: string }[] =>
  (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));
