import type { Page, PageRequest } from '../../../../shared/application/page.js';
import type {
  ImportOrderDetail,
  ImportOrderSummary,
  ImportStatus,
} from '../../domain/import-order.js';

export interface ImportOrderFilters {
  status?: ImportStatus;
  supplierId?: number;
  productId?: number;
  search?: string;
  from?: string;
  to?: string;
}

export interface ImportOrderDraft {
  number: number;
  supplierId: number | null;
  status: ImportStatus;
  reference: string | null;
  orderedAt: string | null;
  expectedAt: string | null;
  receivedAt: string | null;
  notes: string | null;
  createdBy: number | null;
}

export interface ImportItemDraft {
  productId: number;
  quantityOrdered: number;
  unitCostPen: number | null;
  notes: string | null;
}

export type ImportOrderChanges = Partial<Omit<ImportOrderDraft, 'createdBy'>>;

export interface ReceivedLine {
  itemId: number;
  quantityReceived: number;
}

export abstract class ImportOrderRepository {
  abstract list(filters: ImportOrderFilters, page: PageRequest): Promise<Page<ImportOrderSummary>>;
  abstract findById(id: number): Promise<ImportOrderDetail | null>;
  abstract numberExists(number: number, exceptId?: number): Promise<boolean>;
  abstract nextNumber(): Promise<number>;
  abstract create(order: ImportOrderDraft, items: ImportItemDraft[]): Promise<ImportOrderDetail>;
  abstract update(
    id: number,
    changes: ImportOrderChanges,
    items?: ImportItemDraft[],
  ): Promise<ImportOrderDetail>;
  abstract recordReceipt(id: number, lines: ReceivedLine[], receivedAt: string): Promise<void>;
  abstract delete(id: number): Promise<void>;
}
