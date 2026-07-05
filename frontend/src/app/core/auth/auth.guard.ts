import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthTokenStore } from './auth-token-store';

/** Guard: redirects to /login if no auth token is present */
export const authGuard: CanActivateFn = () => {
  const tokenStore = inject(AuthTokenStore);
  const router = inject(Router);

  if (tokenStore.hasToken()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
