import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, firstValueFrom, map, of, shareReplay, tap } from 'rxjs';
import type { User } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  private refreshing$: Observable<User> | null = null;

  async restore(): Promise<void> {
    try {
      this._user.set(await firstValueFrom(this.http.get<User>('/api/auth/me')));
    } catch {
      try {
        this._user.set(await firstValueFrom(this.refresh()));
      } catch {
        this._user.set(null);
      }
    }
  }

  login(email: string, password: string): Observable<User> {
    return this.http
      .post<User>('/api/auth/login', { email, password })
      .pipe(tap((user) => this._user.set(user)));
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
    this._user.set(null);
    void this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url.startsWith('/login') ? null : this.router.url },
    });
  }
}
