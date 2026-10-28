import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { toHttpParams } from '../../core/http/api-utils';
import type { Page, Product, StockMovement } from '../../shared/models/models';

export interface MovementFilters {
  search?: string;
  productId?: number;
  type?: string;
  reason?: string;
  from?: string;
  to?: string;
  referenceType?: string;
  referenceId?: number;
}

@Injectable({ providedIn: 'root' })
export class MovementsApi {
  private readonly http = inject(HttpClient);

  list(filters: MovementFilters, page: number, pageSize: number): Observable<Page<StockMovement>> {
    return this.http.get<Page<StockMovement>>('/api/stock-movements', {
      params: toHttpParams({ ...filters, page, pageSize }),
    });
  }

  export(filters: MovementFilters): Observable<Blob> {
    return this.http.get('/api/stock-movements/export', {
      params: toHttpParams({ ...filters }),
      responseType: 'blob',
    });
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`/api/products/${id}`);
  }
}
