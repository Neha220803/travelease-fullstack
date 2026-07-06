import { Component, input } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';

@Component({
  selector: 'app-stat-card',
  imports: [NgIconComponent],
  template: `
    <div class="bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-shadow">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">{{ label() }}</p>
          <p class="text-2xl font-bold text-foreground mt-1">{{ value() }}</p>
          @if (trend() !== undefined) {
            <div class="flex items-center gap-1 mt-2">
              <ng-icon
                [name]="(trend() ?? 0) >= 0 ? 'lucideTrendingUp' : 'lucideTrendingDown'"
                size="12"
                [class]="(trend() ?? 0) >= 0 ? 'text-green-500' : 'text-destructive'" />
              <span class="text-xs" [class]="(trend() ?? 0) >= 0 ? 'text-green-600' : 'text-destructive'">
                {{ (trend() ?? 0) >= 0 ? '+' : '' }}{{ trend() }}%
              </span>
              <span class="text-xs text-muted-foreground">vs last month</span>
            </div>
          }
        </div>
        @if (icon()) {
          <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
               [style.background]="iconBg() || 'oklch(0.95 0.04 185)'">
            <ng-icon [name]="icon()!" size="18" [style.color]="iconColor() || 'var(--primary)'" />
          </div>
        }
      </div>
    </div>
  `,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number | null>();
  readonly icon = input<string>();
  readonly iconBg = input<string>();
  readonly iconColor = input<string>();
  readonly trend = input<number>();
}
