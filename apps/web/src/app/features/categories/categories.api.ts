import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Category } from '../../shared/models/models';

export interface CategoryInput {
  name: string;
  parentId: number | null;
  sortOrder: number;
}

@Injectable({ providedIn: 'root' })
export class CategoriesApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/categories';

  list(): Observable<Category[]> {
    return this.http.get<Category[]>(this.base);
  }

  create(input: CategoryInput): Observable<Category> {
    return this.http.post<Category>(this.base, input);
  }

  update(id: number, input: Partial<CategoryInput>): Observable<Category> {
    return this.http.patch<Category>(`${this.base}/${id}`, input);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
