import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { toHttpParams } from '../../core/http/api-utils';
import type { EquipmentModel } from '../../shared/models/models';

export interface EquipmentInput {
  name: string;
  brand: string | null;
  description: string | null;
}

@Injectable({ providedIn: 'root' })
export class EquipmentApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/equipment-models';

  list(search?: string): Observable<EquipmentModel[]> {
    return this.http.get<EquipmentModel[]>(this.base, { params: toHttpParams({ search }) });
  }

  create(input: EquipmentInput): Observable<EquipmentModel> {
    return this.http.post<EquipmentModel>(this.base, input);
  }

  update(id: number, input: Partial<EquipmentInput>): Observable<EquipmentModel> {
    return this.http.patch<EquipmentModel>(`${this.base}/${id}`, input);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
