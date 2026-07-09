import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '@app/core/auth/auth.service';
let sessionExpiredShown = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const token = authService.getToken();

  const reqToForward = token 
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) 
    : req;

  return next(reqToForward).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && isBrowser && !req.url.includes('/api/auth/login')) {
        authService.logout();
        if (!sessionExpiredShown) {
          sessionExpiredShown = true;
          alert('Session expired. Please log in again.');
          // reset after some time so it can be shown again if they log in and expire again
          setTimeout(() => { sessionExpiredShown = false; }, 5000);
        }
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
