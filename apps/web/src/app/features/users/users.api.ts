import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Role, User } from '../../shared/models/models';

export interface CreateUserBody {
  email: string;
  name: string;
  password: string;
  role: Role;
}

export interface UpdateUserBody {
  name?: string;
  role?: Role;
  isActive?: boolean;
  password?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);

  list(): Observable<User[]> {
    return this.http.get<User[]>('/api/users');
  }

  create(body: CreateUserBody): Observable<User> {
    return this.http.post<User>('/api/users', body);
  }

  update(id: number, body: UpdateUserBody): Observable<User> {
    return this.http.patch<User>(`/api/users/${id}`, body);
  }
}
