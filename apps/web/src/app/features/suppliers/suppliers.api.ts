import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { toHttpParams } from '../../core/http/api-utils';
import type { Supplier } from '../../shared/models/models';

export interface SupplierFilters {
  search?: string;
  isActive?: boolean;
}

export interface SupplierInput {
  name: string;
  country: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class SuppliersApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/suppliers';

  list(filters: SupplierFilters): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(this.base, { params: toHttpParams({ ...filters }) });
  }

  create(input: SupplierInput): Observable<Supplier> {
    return this.http.post<Supplier>(this.base, input);
  }

  update(id: number, input: Partial<SupplierInput>): Observable<Supplier> {
    return this.http.patch<Supplier>(`${this.base}/${id}`, input);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
