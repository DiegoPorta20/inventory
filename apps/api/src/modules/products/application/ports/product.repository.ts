import type { Page, PageRequest } from '../../../../shared/application/page.js';
import type { EquipmentModel } from '../../../equipment/domain/equipment-model.js';
import type { Product, ProductListItem, UnitOfMeasure } from '../../domain/product.js';

export type StockStatusFilter = 'OUT' | 'LOW' | 'OK' | 'UNCONFIGURED';

export type ProductSortField = 'code' | 'name' | 'stock' | 'updatedAt' | 'cost' | 'price';

export interface ProductFilters {
  search?: string;
  categoryId?: number;
  unit?: UnitOfMeasure;
  stockStatus?: StockStatusFilter;
  importOrderId?: number;
  equipmentId?: number;
  isActive?: boolean;
  isInternalCode?: boolean;
  needsReorder?: boolean;
  costCenterId?: number;
  isConsignment?: boolean;
  hasPrice?: boolean;
  sortBy: ProductSortField;
  sortDirection: 'asc' | 'desc';
}

export interface ProductDraft {
  code: string;
  isInternalCode: boolean;
  name: string;
  description: string | null;
  specification: string | null;
  categoryId: number | null;
  costCenterId: number | null;
  unit: UnitOfMeasure;
  minStock: number;
  reorderQuantity: number;
  location: string | null;
  costPen: number | null;
  pricePen: number | null;
  wholesalePricePen: number | null;
  wholesaleMinQty: number | null;
  isConsignment: boolean;
  notes: string | null;
  isActive: boolean;
}

export type ProductChanges = Partial<ProductDraft>;

export interface ProductDetail extends ProductListItem {
  categoryPath: string | null;
  equipment: EquipmentModel[];
}

export interface BulkProductChanges {
  categoryId?: number | null;
  costCenterId?: number | null;
  minStock?: number;
  reorderQuantity?: number;
  isActive?: boolean;
}

export abstract class ProductRepository {
  abstract search(filters: ProductFilters, page: PageRequest): Promise<Page<ProductListItem>>;
  abstract searchAll(filters: ProductFilters, limit: number): Promise<ProductListItem[]>;
  abstract findById(id: number): Promise<Product | null>;
  abstract findByIdForUpdate(id: number): Promise<Product | null>;
  abstract findByCode(code: string): Promise<Product | null>;
  abstract findByCodes(codes: string[]): Promise<Product[]>;
  abstract findDetail(id: number): Promise<ProductDetail | null>;
  abstract nextInternalSequence(): Promise<number>;
  abstract create(draft: ProductDraft, equipmentIds: number[]): Promise<Product>;
  abstract update(id: number, changes: ProductChanges, equipmentIds?: number[]): Promise<Product>;
  abstract bulkUpdate(ids: number[], changes: BulkProductChanges): Promise<number>;
  abstract setStock(id: number, stock: number): Promise<void>;
  abstract hasHistory(id: number): Promise<boolean>;
  abstract delete(id: number): Promise<void>;
}
