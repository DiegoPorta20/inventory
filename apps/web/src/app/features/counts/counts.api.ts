import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { toHttpParams } from '../../core/http/api-utils';
import type { Category, Page, StockCount, StockCountItem } from '../../shared/models/models';

export interface CountListFilters {
  status?: string;
  categoryId?: number;
}

export interface CountItemFilters {
  search?: string;
  onlyDifferences?: boolean;
  onlyPending?: boolean;
}

export interface CreateCountBody {
  name: string;
  categoryId: number | null;
  note: string | null;
}

export type CompleteCountResult = StockCount & { adjustments: number };

@Injectable({ providedIn: 'root' })
export class CountsApi {
  private readonly http = inject(HttpClient);

  list(filters: CountListFilters, page: number, pageSize: number): Observable<Page<StockCount>> {
    return this.http.get<Page<StockCount>>('/api/stock-counts', {
      params: toHttpParams({ ...filters, page, pageSize }),
    });
  }

  get(id: number): Observable<StockCount> {
    return this.http.get<StockCount>(`/api/stock-counts/${id}`);
  }

  items(
    id: number,
    filters: CountItemFilters,
    page: number,
    pageSize: number,
  ): Observable<Page<StockCountItem>> {
    return this.http.get<Page<StockCountItem>>(`/api/stock-counts/${id}/items`, {
      params: toHttpParams({ ...filters, page, pageSize }),
    });
  }

  create(body: CreateCountBody): Observable<StockCount> {
    return this.http.post<StockCount>('/api/stock-counts', body);
  }

  recordItem(
    id: number,
    itemId: number,
    countedQty: number | null,
    note: string | null,
  ): Observable<StockCountItem> {
    return this.http.patch<StockCountItem>(`/api/stock-counts/${id}/items/${itemId}`, {
      countedQty,
      note,
    });
  }

  confirmPending(id: number): Observable<{ confirmed: number }> {
    return this.http.post<{ confirmed: number }>(`/api/stock-counts/${id}/confirm-pending`, {});
  }

  complete(id: number): Observable<CompleteCountResult> {
    return this.http.post<CompleteCountResult>(`/api/stock-counts/${id}/complete`, {});
  }

  cancel(id: number): Observable<StockCount> {
    return this.http.post<StockCount>(`/api/stock-counts/${id}/cancel`, {});
  }

  categories(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/categories');
  }
}
