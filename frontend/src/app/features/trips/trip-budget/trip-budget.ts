import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { BudgetService } from '@app/core/services/budget.service';
import { BudgetSummary } from '@app/core/models/expense.model';
import { MOCK_BUDGET_SUMMARY } from '@app/core/data/mock-data';

@Component({
  selector: 'app-trip-budget',
  imports: [DecimalPipe, NgIconComponent, HlmSkeletonImports],
  template: `
    <div class="max-w-2xl mx-auto space-y-6">
      <h1 class="text-2xl font-bold">Budget</h1>

      @if (loading()) {
        <div class="bg-card border border-border rounded-xl p-6 space-y-4">
          <hlm-skeleton class="h-8 w-48 rounded" />
          <hlm-skeleton class="h-4 w-full rounded" />
          <hlm-skeleton class="h-4 w-3/4 rounded" />
        </div>
      } @else if (summary()) {
        <div class="bg-card border border-border rounded-xl p-6">
          <div class="flex items-start justify-between mb-6">
            <div>
              <div class="text-3xl font-bold">₹{{ summary()!.totalSpent | number }}</div>
              <div class="text-muted-foreground text-sm mt-1">of ₹{{ summary()!.budgetAmount | number }} budget</div>
            </div>
            <div class="text-right">
              <div class="font-bold" [class]="summary()!.isOverspent ? 'text-destructive' : 'text-green-600'">
                {{ summary()!.isOverspent ? 'OVER BUDGET' : '₹' + (summary()!.remaining | number) + ' left' }}
              </div>
              <div class="text-xs text-muted-foreground">{{ summary()!.usagePercentage | number:'1.1-1' }}% used</div>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="h-4 bg-muted rounded-full overflow-hidden mb-6">
            <div class="h-full rounded-full transition-all"
                 [class]="summary()!.isOverspent ? 'bg-destructive' : 'bg-primary'"
                 [style.width.%]="Math.min(summary()!.usagePercentage, 100)"></div>
          </div>

          <!-- Category breakdown -->
          @if (summary()!.categoryBreakdown && summary()!.categoryBreakdown!.length > 0) {
            <h2 class="text-sm font-semibold mb-3">Spending by Category</h2>
            <div class="space-y-3">
              @for (cat of summary()!.categoryBreakdown!; track cat.category) {
                <div>
                  <div class="flex items-center justify-between text-sm mb-1">
                    <span class="text-muted-foreground">{{ cat.category }}</span>
                    <span class="font-medium">₹{{ cat.amount | number }}</span>
                  </div>
                  <div class="h-2 bg-muted rounded-full overflow-hidden">
                    <div class="h-full bg-primary/60 rounded-full"
                         [style.width.%]="(cat.amount / summary()!.budgetAmount) * 100"></div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class TripBudget implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly budgetService = inject(BudgetService);

  readonly Math = Math;
  readonly loading = signal(true);
  readonly summary = signal<BudgetSummary | null>(null);

  ngOnInit(): void {
    const tripId = this.route.snapshot.paramMap.get('tripId') ?? 'trip1';
    this.budgetService.getBudgetSummary(tripId).subscribe({
      next: (s) => { this.summary.set(s); this.loading.set(false); },
      error: () => { this.summary.set(MOCK_BUDGET_SUMMARY); this.loading.set(false); },
    });
  }
}
