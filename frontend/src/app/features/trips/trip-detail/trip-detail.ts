import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { TripsDummyService } from '@app/core/services/trips-dummy.service';
import { Trip } from '@app/core/models/trip.model';
import { StatusBadge } from '@app/shared/components/status-badge/status-badge';
import { EmptyState } from '@app/shared/components/empty-state/empty-state';

type Tab = 'overview' | 'itinerary' | 'expenses' | 'budget' | 'settlements' | 'members' | 'recommendations' | 'delays';

@Component({
  selector: 'app-trip-detail',
  imports: [RouterLink, DatePipe, DecimalPipe, NgTemplateOutlet, NgIconComponent, HlmButtonImports, HlmSkeletonImports, HlmBadgeImports, StatusBadge, EmptyState],
  template: `
    <div class="space-y-6">
      @if (loading()) {
        <div class="space-y-4">
          <hlm-skeleton class="h-48 w-full rounded-xl" />
          <hlm-skeleton class="h-8 w-64 rounded" />
          <hlm-skeleton class="h-5 w-48 rounded" />
        </div>
      } @else if (!trip()) {
        <app-empty-state icon="lucideMapPin" title="Trip not found"
                         description="This trip doesn't exist or you don't have access."
                         actionLabel="Back to Trips" actionIcon="lucideArrowLeft"
                         (action)="goBack()" />
      } @else {
        <!-- Cover & Header -->
        <div class="relative rounded-2xl overflow-hidden h-48 bg-gradient-to-br from-primary/30 to-primary/10">
          @if (trip()!.coverImage) {
            <img [src]="trip()!.coverImage" [alt]="trip()!.name" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          }
          <div class="absolute bottom-4 left-4 right-4 text-white">
            <div class="flex items-start justify-between">
              <div>
                <h1 class="text-2xl font-bold">{{ trip()!.name }}</h1>
                <div class="flex items-center gap-2 text-white/80 text-sm mt-1">
                  <ng-icon name="lucideMapPin" size="12" />
                  {{ trip()!.source }} → {{ trip()!.destination }}
                  <span>·</span>
                  <ng-icon name="lucideCalendar" size="12" />
                  {{ trip()!.startDate | date:'MMM d' }} – {{ trip()!.endDate | date:'MMM d, yyyy' }}
                  <span>·</span>
                  <ng-icon name="lucideUsers" size="12" />
                  {{ trip()!.memberCount }} members
                </div>
              </div>
              <app-status-badge [status]="trip()!.status" />
            </div>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex gap-2 flex-wrap">
          @if (trip()!.status !== 'CANCELLED' && trip()!.status !== 'COMPLETED') {
            <button hlmBtn variant="outline" size="sm">
              <ng-icon name="lucidePencil" size="12" class="mr-1.5" />
              Edit Trip
            </button>
            <button hlmBtn variant="outline" size="sm" (click)="cancelTrip()">
              <ng-icon name="lucideX" size="12" class="mr-1.5" />
              Cancel Trip
            </button>
          }
          <button hlmBtn variant="outline" size="sm">
            <ng-icon name="lucideUserPlus" size="12" class="mr-1.5" />
            Invite Member
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 overflow-x-auto pb-1">
          @for (tab of tabList; track tab.value) {
            <button class="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    [class]="activeTab() === tab.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
                    (click)="activeTab.set(tab.value)">
              {{ tab.label }}
            </button>
          }
        </div>

        <!-- Tab Content -->
        <div class="min-h-64">
          @switch (activeTab()) {
            @case ('overview') { <ng-container *ngTemplateOutlet="overviewTpl" /> }
            @case ('itinerary') { <ng-container *ngTemplateOutlet="itineraryTpl" /> }
            @case ('expenses') { <ng-container *ngTemplateOutlet="expensesTpl" /> }
            @case ('budget') { <ng-container *ngTemplateOutlet="budgetTpl" /> }
            @case ('settlements') { <ng-container *ngTemplateOutlet="settlementsTpl" /> }
            @case ('members') { <ng-container *ngTemplateOutlet="membersTpl" /> }
            @case ('recommendations') { <ng-container *ngTemplateOutlet="recommendationsTpl" /> }
            @case ('delays') { <ng-container *ngTemplateOutlet="delaysTpl" /> }
          }
        </div>
      }
    </div>

    <!-- ===================== TAB TEMPLATES ===================== -->

    <ng-template #overviewTpl>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="bg-card border border-border rounded-xl p-4">
          <div class="text-xs text-muted-foreground uppercase font-medium mb-1">Trip Type</div>
          <div class="font-semibold">{{ trip()!.travelerCategory }}</div>
        </div>
        <div class="bg-card border border-border rounded-xl p-4">
          <div class="text-xs text-muted-foreground uppercase font-medium mb-1">Duration</div>
          <div class="font-semibold">{{ getDurationDays() }} days</div>
        </div>
        <div class="bg-card border border-border rounded-xl p-4">
          <div class="text-xs text-muted-foreground uppercase font-medium mb-1">Budget</div>
          <div class="font-semibold">{{ trip()!.budgetAmount ? ('₹' + (trip()!.budgetAmount! | number)) : 'Not set' }}</div>
        </div>
      </div>
    </ng-template>

    <ng-template #itineraryTpl>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-sm text-muted-foreground">Manage your trip activities</p>
          <button hlmBtn size="sm">
            <ng-icon name="lucidePlus" size="12" class="mr-1.5" /> Add Activity
          </button>
        </div>
        <app-empty-state icon="lucideCalendarDays" title="No itinerary yet"
                         description="Add activities to start building your itinerary."
                         actionLabel="Add First Activity" actionIcon="lucidePlus" />
      </div>
    </ng-template>

    <ng-template #expensesTpl>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-sm text-muted-foreground">Track shared expenses</p>
          <button hlmBtn size="sm">
            <ng-icon name="lucidePlus" size="12" class="mr-1.5" /> Add Expense
          </button>
        </div>
        <a [routerLink]="['/trips', trip()!.id, 'expenses']" hlmBtn variant="outline" class="w-full">
          Open Full Expense View
        </a>
      </div>
    </ng-template>

    <ng-template #budgetTpl>
      <div>
        <a [routerLink]="['/trips', trip()!.id, 'budget']" hlmBtn variant="outline">
          Open Budget Details
        </a>
      </div>
    </ng-template>

    <ng-template #settlementsTpl>
      <div>
        <a [routerLink]="['/trips', trip()!.id, 'settlements']" hlmBtn variant="outline">
          Open Settlements
        </a>
      </div>
    </ng-template>

    <ng-template #membersTpl>
      <div class="space-y-3">
        @for (m of members(); track m.id) {
          <div class="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
            <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
              {{ m.userName.charAt(0) }}
            </div>
            <div class="flex-1">
              <div class="text-sm font-medium">{{ m.userName }}</div>
              <div class="text-xs text-muted-foreground">{{ m.userEmail }}</div>
            </div>
            <span class="text-xs font-medium px-2 py-0.5 rounded-full"
                  [class]="m.role === 'ORGANIZER' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'">
              {{ m.role }}
            </span>
          </div>
        }
      </div>
    </ng-template>

    <ng-template #recommendationsTpl>
      <div>
        <a [routerLink]="['/trips', trip()!.id, 'recommendations']" hlmBtn variant="outline">
          View Recommendations
        </a>
      </div>
    </ng-template>

    <ng-template #delaysTpl>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-sm text-muted-foreground">Report and manage delays</p>
          <button hlmBtn size="sm" variant="destructive">
            <ng-icon name="lucideAlertTriangle" size="12" class="mr-1.5" /> Report Delay
          </button>
        </div>
        <a [routerLink]="['/trips', trip()!.id, 'delays']" hlmBtn variant="outline" class="w-full">
          Open Delay Management
        </a>
      </div>
    </ng-template>
  `,
})
export class TripDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly tripsService = inject(TripsDummyService);

  readonly loading = signal(true);
  readonly trip = signal<Trip | undefined>(undefined);
  readonly activeTab = signal<Tab>('overview');

  readonly members = () => [
    { id: 'tm1', tripId: this.trip()?.id ?? '', userId: 'u1', userName: 'Arjun Sharma', userEmail: 'arjun@example.com', role: 'ORGANIZER' as const, joinedAt: '' },
    { id: 'tm2', tripId: this.trip()?.id ?? '', userId: 'u2', userName: 'Priya Nair', userEmail: 'priya@example.com', role: 'MEMBER' as const, joinedAt: '' },
  ];

  readonly tabList: { label: string; value: Tab }[] = [
    { label: 'Overview', value: 'overview' },
    { label: 'Itinerary', value: 'itinerary' },
    { label: 'Expenses', value: 'expenses' },
    { label: 'Budget', value: 'budget' },
    { label: 'Settlements', value: 'settlements' },
    { label: 'Members', value: 'members' },
    { label: 'Recommendations', value: 'recommendations' },
    { label: 'Delays', value: 'delays' },
  ];

  ngOnInit(): void {
    const tripId = this.route.snapshot.paramMap.get('tripId') ?? '';
    this.tripsService.getTrip(tripId).subscribe(trip => {
      this.trip.set(trip);
      this.loading.set(false);
    });
  }

  getDurationDays(): number {
    const t = this.trip();
    if (!t) return 0;
    const start = new Date(t.startDate);
    const end = new Date(t.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  goBack(): void {
    window.history.back();
  }

  cancelTrip(): void {
    const trip = this.trip();
    if (!trip) return;
    this.tripsService.cancelTrip(trip.id).subscribe(updated => {
      this.trip.set(updated);
    });
  }
}
