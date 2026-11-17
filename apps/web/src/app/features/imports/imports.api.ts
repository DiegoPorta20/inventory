import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { toHttpParams } from '../../core/http/api-utils';
import type {
  ImportOrderDetail,
  ImportOrderSummary,
  ImportStatus,
  Page,
} from '../../shared/models/models';

export interface ImportFilters {
  status?: ImportStatus;
  supplierId?: number;
  productId?: number;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface ImportOrderItemInput {
  productId: number;
  quantityOrdered: number;
  unitCostPen: number | null;
  notes?: string | null;
}

export interface ImportOrderInput {
  number?: number;
  supplierId: number | null;
  reference: string | null;
  orderedAt: string | null;
  expectedAt: string | null;
  notes: string | null;
  items: ImportOrderItemInput[];
  status?: 'DRAFT' | 'ORDERED';
}

export interface ReceiveLine {
  itemId: number;
  quantityReceived: number;
}

export interface ReceiveInput {
  receivedAt?: string;
  lines?: ReceiveLine[];
}

@Injectable({ providedIn: 'root' })
export class ImportsApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/imports';

  list(filters: ImportFilters): Observable<Page<ImportOrderSummary>> {
    return this.http.get<Page<ImportOrderSummary>>(this.base, {
      params: toHttpParams({ ...filters }),
    });
  }

  get(id: number): Observable<ImportOrderDetail> {
    return this.http.get<ImportOrderDetail>(`${this.base}/${id}`);
  }

  create(input: ImportOrderInput): Observable<ImportOrderDetail> {
    return this.http.post<ImportOrderDetail>(this.base, input);
  }

  update(id: number, input: Omit<ImportOrderInput, 'status'>): Observable<ImportOrderDetail> {
    return this.http.patch<ImportOrderDetail>(`${this.base}/${id}`, input);
  }

  changeStatus(id: number, status: ImportStatus): Observable<ImportOrderDetail> {
    return this.http.post<ImportOrderDetail>(`${this.base}/${id}/status`, { status });
  }

  receive(id: number, input: ReceiveInput): Observable<ImportOrderDetail> {
    return this.http.post<ImportOrderDetail>(`${this.base}/${id}/receive`, input);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
