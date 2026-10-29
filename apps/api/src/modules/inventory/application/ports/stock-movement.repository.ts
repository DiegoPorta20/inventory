import type { Page, PageRequest } from '../../../../shared/application/page.js';
import type {
  MovementReason,
  MovementType,
  ReferenceType,
  StockMovement,
  StockMovementView,
} from '../../domain/stock-movement.js';

export interface NewStockMovement {
  productId: number;
  type: MovementType;
  reason: MovementReason;
  quantity: number;
  stockAfter: number;
  unitPricePen?: number | null;
  counterparty?: string | null;
  referenceType?: ReferenceType | null;
  referenceId?: number | null;
  note?: string | null;
  userId?: number | null;
  occurredAt?: Date;
}

export interface MovementFilters {
  productId?: number;
  type?: MovementType;
  reason?: MovementReason;
  userId?: number;
  from?: string;
  to?: string;
  search?: string;
  referenceType?: ReferenceType;
  referenceId?: number;
}

export abstract class StockMovementRepository {
  abstract create(movement: NewStockMovement): Promise<StockMovement>;
  abstract search(filters: MovementFilters, page: PageRequest): Promise<Page<StockMovementView>>;
  abstract searchAll(filters: MovementFilters, limit: number): Promise<StockMovementView[]>;
}
