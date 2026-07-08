import { CanActivateFn, Router } from '@angular/router';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '@app/core/auth/auth.service';
import { ROLE_HOME, Role } from '@app/core/auth/auth.models';

export const authGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  if (!isBrowser) {
    return true; // During SSR, skip auth check so we don't accidentally route to /login
  }

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const requiredRole = route.data['role'] as Role | undefined;
  const currentRole = authService.role();
  if (requiredRole && currentRole && requiredRole !== currentRole) {
    return router.createUrlTree([ROLE_HOME[currentRole]]);
  }

  return true;
};
