import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);

  return next(request).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;
      if (!isUnauthorized || request.url.includes('/api/auth/')) return throwError(() => error);

      return auth.refresh().pipe(
        switchMap(() => next(request)),
        catchError(() => {
          auth.expireSession();
          return throwError(() => error);
        }),
      );
    }),
  );
};
