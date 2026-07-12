import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'te_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly theme = signal<Theme>(this.readInitialTheme());

  constructor() {
    effect(() => {
      const theme = this.theme();
      if (!this.isBrowser) {
        return;
      }
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }
      if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem(THEME_KEY, theme);
      }
    });
  }

  toggleTheme(): void {
    this.theme.update((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  private readInitialTheme(): Theme {
    if (!this.isBrowser) {
      return 'light';
    }
    // index.html runs a blocking inline script that applies this same logic
    // before Angular hydrates, so the root element already reflects it - this
    // just needs to agree, not re-decide, to avoid a hydration mismatch.
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  }
}
