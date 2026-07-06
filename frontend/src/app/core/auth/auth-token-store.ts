import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Single source of truth for the auth access token.
 *
 * Currently stores in sessionStorage (clears on tab close — safer than localStorage).
 *
 * TODO: Switch to httpOnly cookies when the backend supports them.
 * When that happens, remove the set/get/clear logic here and let the browser
 * handle the cookie automatically. The interceptor will need to drop the
 * Authorization header injection as well.
 */
@Injectable({ providedIn: 'root' })
export class AuthTokenStore {
  private readonly TOKEN_KEY = 'te_access_token';
  private readonly platformId = inject(PLATFORM_ID);
  // In-memory fallback for SSR
  private _memoryToken: string | null = null;

  private get storage(): Storage | null {
    if (isPlatformBrowser(this.platformId)) {
      return sessionStorage;
    }
    return null;
  }

  setToken(token: string): void {
    this._memoryToken = token;
    this.storage?.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return this.storage?.getItem(this.TOKEN_KEY) ?? null;
    }
    return this._memoryToken;
  }

  clearToken(): void {
    this._memoryToken = null;
    this.storage?.removeItem(this.TOKEN_KEY);
  }

  hasToken(): boolean {
    return !!this.getToken();
  }
}
