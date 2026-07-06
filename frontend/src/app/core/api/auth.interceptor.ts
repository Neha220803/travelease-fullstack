import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthTokenStore } from '@app/core/auth/auth-token-store';

/**
 * Auth interceptor — attaches Bearer token and handles 401 by clearing the session.
 *
 * TODO: When the backend switches to httpOnly cookie auth, remove the Authorization
 * header injection here; the browser will send the cookie automatically.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStore = inject(AuthTokenStore);
  const router = inject(Router);

  const token = tokenStore.getToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err) => {
      if (err.status === 401) {
        tokenStore.clearToken();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
