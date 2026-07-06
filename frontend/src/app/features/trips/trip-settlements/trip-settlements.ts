import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { SettlementService } from '@app/core/services/settlement.service';
import { Settlement } from '@app/core/models/settlement.model';
import { StatusBadge } from '@app/shared/components/status-badge/status-badge';
import { EmptyState } from '@app/shared/components/empty-state/empty-state';
import { MOCK_SETTLEMENTS } from '@app/core/data/mock-data';

@Component({
  selector: 'app-trip-settlements',
  imports: [DatePipe, DecimalPipe, NgIconComponent, HlmButtonImports, HlmSkeletonImports, StatusBadge, EmptyState],
  template: `
    <div class="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 class="text-2xl font-bold">Settlements</h1>
        <p class="text-muted-foreground text-sm mt-0.5">Settle up outstanding expenses</p>
      </div>

      @if (loading()) {
        <div class="space-y-3">
          @for (_ of [1,2,3]; track $index) {
            <div class="bg-card border border-border rounded-xl p-4">
              <hlm-skeleton class="h-5 w-3/4 rounded mb-2" />
              <hlm-skeleton class="h-4 w-1/2 rounded" />
            </div>
          }
        </div>
      } @else if (settlements().length === 0) {
        <app-empty-state icon="lucideCreditCard" title="All settled up!"
                         description="No outstanding settlements for this trip." />
      } @else {
        <!-- Summary -->
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-card border border-border rounded-xl p-4">
            <div class="text-xs text-muted-foreground uppercase font-medium mb-1">You owe</div>
            <div class="text-xl font-bold text-destructive">₹{{ totalOwed() | number }}</div>
          </div>
          <div class="bg-card border border-border rounded-xl p-4">
            <div class="text-xs text-muted-foreground uppercase font-medium mb-1">Owed to you</div>
            <div class="text-xl font-bold text-green-600">₹{{ totalOwedToMe() | number }}</div>
          </div>
        </div>

        <!-- Settlement list -->
        <div class="space-y-3">
          @for (s of settlements(); track s.id) {
            <div class="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium">
                  <span class="text-primary">{{ s.fromUserName }}</span>
                  <span class="text-muted-foreground mx-2">→</span>
                  <span>{{ s.toUserName }}</span>
                </div>
                <div class="text-xs text-muted-foreground mt-0.5">
                  @if (s.paidAt) { Paid on {{ s.paidAt | date:'MMM d, yyyy' }} }
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <div class="font-bold">₹{{ s.amount | number }}</div>
                <app-status-badge [status]="s.status" />
              </div>
              @if (s.status === 'PENDING') {
                <button hlmBtn size="sm" (click)="markPaid(s.id)">Mark Paid</button>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class TripSettlements implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly settlementService = inject(SettlementService);

  readonly loading = signal(true);
  readonly settlements = signal<Settlement[]>([]);
  readonly totalOwed = () => this.settlements().filter(s => s.fromUserId === 'u1' && s.status === 'PENDING').reduce((sum, s) => sum + s.amount, 0);
  readonly totalOwedToMe = () => this.settlements().filter(s => s.toUserId === 'u1' && s.status === 'PENDING').reduce((sum, s) => sum + s.amount, 0);

  ngOnInit(): void {
    const tripId = this.route.snapshot.paramMap.get('tripId') ?? 'trip1';
    this.settlementService.getMySettlements(tripId).subscribe({
      next: (s) => { this.settlements.set(s); this.loading.set(false); },
      error: () => { this.settlements.set(MOCK_SETTLEMENTS); this.loading.set(false); },
    });
  }

  markPaid(id: string): void {
    this.settlementService.markPaid(id).subscribe({
      next: (updated) => {
        this.settlements.update(ss => ss.map(s => s.id === id ? updated : s));
      },
      error: () => {
        this.settlements.update(ss => ss.map(s => s.id === id ? { ...s, status: 'PAID' as const } : s));
      },
    });
  }
}
