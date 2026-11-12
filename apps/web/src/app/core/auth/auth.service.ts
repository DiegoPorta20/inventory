import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  finalize,
  firstValueFrom,
  from,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import type { User } from '../../shared/models/models';
import { ClientConfigService } from '../config/client-config.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly config = inject(ClientConfigService);

  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  private refreshing$: Observable<User> | null = null;

  /** Where an unauthenticated visitor goes: their company's sign-in page when we know it. */
  get loginPath(): string {
    const company = this.config.lastCompany;
    return company ? `/${company}/login` : '/login';
  }

  async restore(): Promise<void> {
    try {
      this._user.set(await firstValueFrom(this.http.get<User>('/api/auth/me')));
    } catch {
      try {
        this._user.set(await firstValueFrom(this.refresh()));
      } catch {
        this._user.set(null);
        return;
      }
    }
    try {
      await this.config.load();
    } catch {
      this._user.set(null);
    }
  }

  login(company: string, email: string, password: string): Observable<User> {
    return this.http.post<User>('/api/auth/login', { company, email, password }).pipe(
      switchMap((user) => from(this.config.load()).pipe(map(() => user))),
      tap((user) => this._user.set(user)),
    );
  }

  refresh(): Observable<User> {
    this.refreshing$ ??= this.http.post<User>('/api/auth/refresh', {}).pipe(
      tap((user) => this._user.set(user)),
      finalize(() => (this.refreshing$ = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refreshing$;
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}).pipe(
      catchError(() => of(undefined)),
      map(() => undefined),
      tap(() => this.clearSession()),
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>('/api/auth/change-password', { currentPassword, newPassword });
  }

  expireSession(): void {
    if (!this._user()) return;
    this.clearSession();
  }

  private clearSession(): void {
    const path = this.loginPath;
    this._user.set(null);
    this.config.clear();
    void this.router.navigate([path], {
      queryParams: { returnUrl: this.router.url.endsWith('/login') ? null : this.router.url },
    });
  }
}
