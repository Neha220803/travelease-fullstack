import { Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { AdminDummyService } from '@app/core/services/admin-dummy.service';
import { MOCK_ADMIN_FUNNEL } from '@app/core/data/mock-data';

@Component({
  selector: 'app-admin-funnel',
  imports: [DecimalPipe, NgIconComponent],
  template: `
    <div class="max-w-2xl space-y-6">
      <div>
        <h1 class="text-2xl font-bold">Conversion Funnel</h1>
        <p class="text-muted-foreground text-sm mt-0.5">User journey from visitor to trip completion</p>
      </div>

      <div class="bg-card border border-border rounded-xl p-6">
        <div class="space-y-3">
          @for (stage of funnel(); track stage.stage; let i = $index) {
            <div>
              <div class="flex items-center justify-between text-sm mb-1.5">
                <span class="font-medium">{{ stage.stage }}</span>
                <span class="text-muted-foreground">{{ stage.count | number }}</span>
              </div>
              <div class="h-10 bg-muted rounded-lg overflow-hidden relative">
                <div class="h-full rounded-lg transition-all duration-700 flex items-center justify-end pr-3"
                     [style.width]="(stage.count / funnel()[0].count * 100) + '%'"
                     [style.background]="barColor(i)">
                  <span class="text-white text-xs font-bold">
                    {{ (stage.count / funnel()[0].count * 100) | number:'1.0-0' }}%
                  </span>
                </div>
              </div>
              @if (i < funnel().length - 1) {
                <div class="text-xs text-muted-foreground mt-1 text-right">
                  Drop-off: {{ ((1 - funnel()[i + 1].count / stage.count) * 100) | number:'1.1-1' }}%
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class AdminFunnel implements OnInit {
  private readonly service = inject(AdminDummyService);
  readonly funnel = signal<{ stage: string; count: number }[]>([]);

  readonly colors = [
    'oklch(0.52 0.14 185)',
    'oklch(0.55 0.15 195)',
    'oklch(0.58 0.14 200)',
    'oklch(0.55 0.14 215)',
    'oklch(0.52 0.13 230)',
    'oklch(0.5 0.12 245)',
  ];

  ngOnInit(): void {
    this.service.getFunnelData().subscribe(f => this.funnel.set(f));
  }

  barColor(i: number): string {
    return this.colors[i] ?? this.colors[this.colors.length - 1];
  }
}
