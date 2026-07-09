import { AuthLayout } from '@app/shared/layout/auth-layout/auth-layout';
import { Login } from '@app/features/auth/components/login/login';
import { Register } from '@app/features/auth/components/register/register';
import { PartnerRegister } from '@app/features/auth/components/partner-register/partner-register';
import { ForgotPassword } from '@app/features/auth/components/forgot-password/forgot-password';
import { AUTH_ROUTES } from './auth.routes';

describe('AUTH_ROUTES', () => {
  it('wraps login and register in the AuthLayout', async () => {
    expect(AUTH_ROUTES).toHaveLength(1);
    const shellRoute = AUTH_ROUTES[0];
    expect(shellRoute.path).toBe('');
    const loaded = await shellRoute.loadComponent!();
    expect(loaded).toBe(AuthLayout);
  });

  it('defines login, register, partner-register, and forgot-password as children', () => {
    const children = AUTH_ROUTES[0].children ?? [];
    expect(children.map((r) => r.path)).toEqual([
      'login',
      'register',
      'partner-register',
      'forgot-password',
    ]);
  });

  it('lazily loads the real components for login, register, partner-register, and forgot-password', async () => {
    const children = AUTH_ROUTES[0].children ?? [];
    expect(await children[0].loadComponent!()).toBe(Login);
    expect(await children[1].loadComponent!()).toBe(Register);
    expect(await children[2].loadComponent!()).toBe(PartnerRegister);
    expect(await children[3].loadComponent!()).toBe(ForgotPassword);
  });
});
