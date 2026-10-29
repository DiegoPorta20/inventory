import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { toHttpParams } from '../../core/http/api-utils';
import type {
  Category,
  CostCenter,
  EquipmentModel,
  ImportOrderSummary,
  Page,
  PricedProduct,
  Product,
  ProductDetail,
  ProductImportPreview,
  ProductImportResult,
  StockMovement,
  StockStatusFilter,
  UnitOfMeasure,
} from '../../shared/models/models';

const formWith = (file: File): FormData => {
  const form = new FormData();
  form.append('file', file);
  return form;
};

export type ProductSortBy = 'code' | 'name' | 'stock' | 'updatedAt' | 'cost' | 'price';
export type SortDirection = 'asc' | 'desc';

export interface ProductListFilters {
  search?: string;
  categoryId?: number;
  costCenterId?: number;
  unit?: UnitOfMeasure;
  stockStatus?: StockStatusFilter;
  importOrderId?: number;
  equipmentId?: number;
  isActive?: boolean;
  isInternalCode?: boolean;
  isConsignment?: boolean;
  hasPrice?: boolean;
  sortBy?: ProductSortBy;
  sortDirection?: SortDirection;
  page?: number;
  pageSize?: number;
}

export interface ProductInput {
  code?: string;
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
  equipmentIds: number[];
}

export interface BulkChanges {
  categoryId?: number | null;
  costCenterId?: number | null;
  minStock?: number;
  reorderQuantity?: number;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProductsApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/products';

  list(filters: ProductListFilters): Observable<Page<PricedProduct>> {
    return this.http.get<Page<PricedProduct>>(this.base, {
      params: toHttpParams({ ...filters }),
    });
  }

  get(id: number): Observable<ProductDetail> {
    return this.http.get<ProductDetail>(`${this.base}/${id}`);
  }

  create(input: ProductInput): Observable<Product> {
    return this.http.post<Product>(this.base, input);
  }

  update(id: number, input: Partial<ProductInput>): Observable<Product> {
    return this.http.patch<Product>(`${this.base}/${id}`, input);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  bulkUpdate(ids: number[], changes: BulkChanges): Observable<unknown> {
    return this.http.patch(`${this.base}/bulk`, { ids, changes });
  }

  export(filters: Omit<ProductListFilters, 'page' | 'pageSize'>): Observable<Blob> {
    return this.http.get(`${this.base}/export`, {
      params: toHttpParams({ ...filters }),
      responseType: 'blob',
    });
  }

  exportPriceList(filters: Omit<ProductListFilters, 'page' | 'pageSize'>): Observable<Blob> {
    return this.http.get(`${this.base}/price-list/export`, {
      params: toHttpParams({ ...filters }),
      responseType: 'blob',
    });
  }

  downloadImportTemplate(): Observable<Blob> {
    return this.http.get(`${this.base}/import/template`, { responseType: 'blob' });
  }

  previewImport(file: File): Observable<ProductImportPreview> {
    return this.http.post<ProductImportPreview>(`${this.base}/import/preview`, formWith(file));
  }

  importProducts(file: File): Observable<ProductImportResult> {
    return this.http.post<ProductImportResult>(`${this.base}/import`, formWith(file));
  }

  listCategories(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/categories');
  }

  listCostCenters(): Observable<CostCenter[]> {
    return this.http.get<CostCenter[]>('/api/cost-centers');
  }

  listEquipment(): Observable<EquipmentModel[]> {
    return this.http.get<EquipmentModel[]>('/api/equipment-models');
  }

  listImports(): Observable<Page<ImportOrderSummary>> {
    return this.http.get<Page<ImportOrderSummary>>('/api/imports', {
      params: toHttpParams({ pageSize: 100 }),
    });
  }

  listProductImports(productId: number): Observable<Page<ImportOrderSummary>> {
    return this.http.get<Page<ImportOrderSummary>>('/api/imports', {
      params: toHttpParams({ productId, pageSize: 50 }),
    });
  }

  listProductMovements(productId: number): Observable<Page<StockMovement>> {
    return this.http.get<Page<StockMovement>>('/api/stock-movements', {
      params: toHttpParams({ productId, pageSize: 10 }),
    });
  }
}
