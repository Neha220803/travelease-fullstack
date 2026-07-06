import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiClientService } from '@app/core/api/api-client.service';
import { AuthTokenStore } from './auth-token-store';
import { User } from '@app/core/models/user.model';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClientService);
  private readonly tokenStore = inject(AuthTokenStore);
  private readonly router = inject(Router);

  private readonly _currentUser = signal<User | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this._currentUser());

  /**
   * Attempt login via POST /api/auth/login.
   * On success stores the token and user signal.
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('/api/auth/login', credentials).pipe(
      tap((res) => {
        this.tokenStore.setToken(res.accessToken);
        this._currentUser.set(res.user);
      }),
    );
  }

  /**
   * Register a new user via POST /api/auth/register.
   * On success stores the token and user signal.
   */
  register(data: RegisterRequest): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('/api/auth/register', data).pipe(
      tap((res) => {
        this.tokenStore.setToken(res.accessToken);
        this._currentUser.set(res.user);
      }),
    );
  }

  /**
   * Fetch the current user profile via GET /api/auth/me.
   * Called on app init when a token is already stored.
   */
  fetchMe(): Observable<User> {
    return this.api.get<User>('/api/auth/me').pipe(
      tap((user) => this._currentUser.set(user)),
    );
  }

  logout(): void {
    this.tokenStore.clearToken();
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }

  /** Seed the user signal (used by guards after fetchMe). */
  setUser(user: User): void {
    this._currentUser.set(user);
  }
}
