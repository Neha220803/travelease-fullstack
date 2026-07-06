import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export type UserRole = 'TRAVELER' | 'ADMIN' | 'HOTEL_PROVIDER' | 'TRANSPORT_PROVIDER' | 'ACTIVITY_PROVIDER';

/** Guard factory: pass the roles that are allowed to access the route */
export function roleGuard(...allowedRoles: UserRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const user = auth.currentUser();
    if (!user) {
      return router.createUrlTree(['/login']);
    }

    if (allowedRoles.includes(user.role as UserRole)) {
      return true;
    }

    // Redirect to appropriate dashboard based on role
    const roleHome: Record<string, string> = {
      TRAVELER: '/dashboard',
      ADMIN: '/admin',
      HOTEL_PROVIDER: '/hotel',
      TRANSPORT_PROVIDER: '/transport',
      ACTIVITY_PROVIDER: '/activity',
    };
    return router.createUrlTree([roleHome[user.role] ?? '/login']);
  };
}
