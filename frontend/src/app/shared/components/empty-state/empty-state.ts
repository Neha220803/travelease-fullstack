import { Component, input, output } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-empty-state',
  imports: [NgIconComponent, HlmButtonImports],
  template: `
    <div class="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div class="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <ng-icon [name]="icon()" size="28" class="text-muted-foreground" />
      </div>
      <h3 class="text-base font-semibold text-foreground mb-2">{{ title() }}</h3>
      <p class="text-sm text-muted-foreground max-w-xs mb-6">{{ description() }}</p>
      @if (actionLabel()) {
        <button hlmBtn (click)="action.emit()">
          <ng-icon [name]="actionIcon() || 'lucidePlus'" size="14" class="mr-1.5" />
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
})
export class EmptyState {
  readonly icon = input<string>('lucidePackage');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly actionLabel = input<string>();
  readonly actionIcon = input<string>();
  readonly action = output<void>();
}
