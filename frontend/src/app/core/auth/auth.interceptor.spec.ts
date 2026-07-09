import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';
import { authInterceptor } from '@app/core/auth/auth.interceptor';
import { vi } from 'vitest';

describe('authInterceptor', () => {
  async function setup(token: string | null) {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getToken: () => token } },
      ],
    }).compileComponents();
    return {
      http: TestBed.inject(HttpClient),
      httpMock: TestBed.inject(HttpTestingController),
    };
  }

  it('attaches the Authorization header when a token is present', async () => {
    const { http, httpMock } = await setup('jwt-token');
    http.get('/api/whatever').subscribe();
    const req = httpMock.expectOne('/api/whatever');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    req.flush({});
  });

  it('omits the Authorization header when no token is present', async () => {
    const { http, httpMock } = await setup(null);
    http.get('/api/whatever').subscribe();
    const req = httpMock.expectOne('/api/whatever');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('on 401: logs out and redirects to /login', async () => {
    const logout = vi.fn();
    const navigate = vi.fn().mockResolvedValue(true);
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getToken: () => 'jwt-token', logout } },
        { provide: Router, useValue: { navigate } },
      ],
    }).compileComponents();
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);

    http.get('/api/whatever').subscribe({ error: () => {} });
    const req = httpMock.expectOne('/api/whatever');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('on 403: does not log out or redirect, and rethrows the error', async () => {
    const logout = vi.fn();
    const navigate = vi.fn().mockResolvedValue(true);
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getToken: () => 'jwt-token', logout } },
        { provide: Router, useValue: { navigate } },
      ],
    }).compileComponents();
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);

    let caughtStatus: number | undefined;
    http.get('/api/whatever').subscribe({ error: (err) => (caughtStatus = err.status) });
    const req = httpMock.expectOne('/api/whatever');
    req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(caughtStatus).toBe(403);
  });
});
