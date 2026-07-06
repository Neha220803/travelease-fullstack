import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Exclude auth routes from interception
  if (req.url.includes('/api/auth/')) {
    return next(req);
  }

  // Retrieve token from local storage (must handle SSR correctly)
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('jwtToken');
  }

  // Clone request and attach token if it exists
  if (token) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(authReq);
  }

  return next(req);
};
