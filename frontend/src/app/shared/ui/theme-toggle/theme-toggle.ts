import { Component, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { ThemeService } from '@app/core/theme/theme.service';

@Component({
  selector: 'app-theme-toggle',
  imports: [NgIcon, HlmButtonImports],
  templateUrl: './theme-toggle.html',
})
export class ThemeToggle {
  protected readonly themeService = inject(ThemeService);

  protected toggle(): void {
    this.themeService.toggleTheme();
  }
}
