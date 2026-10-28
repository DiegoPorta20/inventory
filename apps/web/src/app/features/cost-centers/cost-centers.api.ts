import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { CostCenter } from '../../shared/models/models';

export interface CostCenterInput {
  name: string;
}

@Injectable({ providedIn: 'root' })
export class CostCentersApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/cost-centers';

  list(): Observable<CostCenter[]> {
    return this.http.get<CostCenter[]>(this.base);
  }

  create(input: CostCenterInput): Observable<CostCenter> {
    return this.http.post<CostCenter>(this.base, input);
  }

  update(id: number, input: CostCenterInput): Observable<CostCenter> {
    return this.http.patch<CostCenter>(`${this.base}/${id}`, input);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
