import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { toHttpParams } from '../../core/http/api-utils';
import type { Category, ReorderReport } from '../../shared/models/models';

export interface ReorderFilters {
  search?: string;
  categoryId?: number;
  equipmentId?: number;
  onlyOutOfStock?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ReorderApi {
  private readonly http = inject(HttpClient);

  suggestions(filters: ReorderFilters): Observable<ReorderReport> {
    return this.http.get<ReorderReport>('/api/reorder/suggestions', {
      params: toHttpParams({ ...filters }),
    });
  }

  export(filters: ReorderFilters): Observable<Blob> {
    return this.http.get('/api/reorder/export', {
      params: toHttpParams({ ...filters }),
      responseType: 'blob',
    });
  }

  categories(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/categories');
  }
}
