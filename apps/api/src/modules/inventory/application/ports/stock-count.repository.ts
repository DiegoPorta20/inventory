import type { Page, PageRequest } from '../../../../shared/application/page.js';
import type {
  StockCount,
  StockCountItem,
  StockCountStatus,
  StockCountSummary,
} from '../../domain/stock-count.js';

export interface NewStockCount {
  name: string;
  categoryId: number | null;
  note: string | null;
  createdBy: number;
}

export interface StockCountFilters {
  status?: StockCountStatus;
  categoryId?: number;
}

export interface StockCountItemFilters {
  search?: string;
  onlyDifferences?: boolean;
  onlyPending?: boolean;
}

export abstract class StockCountRepository {
  abstract createWithSnapshot(count: NewStockCount): Promise<StockCount>;
  abstract findById(id: number): Promise<StockCount | null>;
  abstract list(
    filters: StockCountFilters,
    page: PageRequest,
  ): Promise<Page<StockCount & { summary: StockCountSummary }>>;
  abstract summaryOf(id: number): Promise<StockCountSummary>;
  abstract findItems(
    id: number,
    filters: StockCountItemFilters,
    page: PageRequest,
  ): Promise<Page<StockCountItem>>;
  abstract findCountedItems(id: number): Promise<StockCountItem[]>;
  abstract updateItem(
    id: number,
    itemId: number,
    countedQty: number | null,
    note: string | null | undefined,
  ): Promise<StockCountItem | null>;
  abstract confirmPendingItems(id: number): Promise<number>;
  abstract setStatus(id: number, status: StockCountStatus, completedAt?: Date): Promise<void>;
}
