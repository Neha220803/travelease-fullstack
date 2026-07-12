import { Component, inject, PLATFORM_ID, signal, OnInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { ThemeService } from '@app/core/theme/theme.service';

@Component({
  selector: 'app-theme-toggle',
  imports: [NgIcon, HlmButtonImports],
  templateUrl: './theme-toggle.html',
})
export class ThemeToggle implements OnInit {
  protected readonly themeService = inject(ThemeService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly isMounted = signal(false);

  ngOnInit() {
    if (this.isBrowser) {
      this.isMounted.set(true);
    }
  }

  protected toggle(): void {
    this.themeService.toggleTheme();
  }
}
