import { Component, computed, inject, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { EChart } from '@app/shared/ui/echart/echart';
import { CHART_COLORS } from '@app/shared/ui/echart/echart-theme';
import { buildGrowthBarOption } from '@app/shared/ui/echart/growth-bar-chart';
import { buildRankingBarOption } from '@app/shared/ui/echart/ranking-bar-chart';
import { ActivityService } from '@app/features/activity/services/activity.service';
import { ActivityBooking, ActivityOverview } from '@app/features/activity/services/activity.models';
import type { EChartsCoreOption } from 'echarts/core';

interface OccupancyView {
  id: string;
  name: string;
  booked: number;
  slots: number;
  pct: number;
  toneClass: string;
}

export function occupancyTone(pct: number): string {
  if (pct > 80) return 'bg-success';
  if (pct > 50) return 'bg-primary';
  return 'bg-warning';
}

export function isRevenueEligible(status: ActivityBooking['status']): boolean {
  return status !== 'CANCELLED';
}

export function isSameMonth(isoDate: string, reference: Date): boolean {
  const d = new Date(isoDate);
  return d.getFullYear() === reference.getFullYear() && d.getMonth() === reference.getMonth();
}

@Component({
  selector: 'app-activity-dashboard',
  imports: [NgIcon, HlmCardImports, PageHeader, StatusBadge, EChart],
  templateUrl: './activity-dashboard.html',
})
export class ActivityDashboard {
  private readonly activityService = inject(ActivityService);

  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  private readonly overview = signal<ActivityOverview[]>([]);

  public readonly activitiesListed = computed(() => this.overview().length);

  private readonly allBookings = computed(() => this.overview().flatMap((o) => o.bookings));

  public readonly bookingsReceived = computed(() => this.allBookings().length);

  public readonly availableSlots = computed(() =>
    this.overview().reduce(
      (sum, o) => sum + o.slots.reduce((s, slot) => s + slot.remainingCapacity, 0),
      0,
    ),
  );

  public readonly revenueMtd = computed(() => {
    const now = new Date();
    const total = this.allBookings()
      .filter((b) => isRevenueEligible(b.status) && isSameMonth(b.bookedAt, now))
      .reduce((sum, b) => sum + b.totalAmount, 0);
    return `₹${(total / 1000).toFixed(total > 0 && total < 1000 ? 1 : 0)}k`;
  });

  public readonly occupancy = computed<OccupancyView[]>(() =>
    this.overview().map((o) => {
      const totalCapacity = o.slots.reduce((s, slot) => s + slot.capacity, 0);
      const remaining = o.slots.reduce((s, slot) => s + slot.remainingCapacity, 0);
      const booked = totalCapacity - remaining;
      const pct = totalCapacity > 0 ? (booked / totalCapacity) * 100 : 0;
      return {
        id: o.activity.activityId,
        name: o.activity.activityName,
        booked,
        slots: totalCapacity,
        pct,
        toneClass: occupancyTone(pct),
      };
    }),
  );

  public readonly recentBookings = computed(() =>
    [...this.allBookings()].sort((a, b) => b.bookedAt.localeCompare(a.bookedAt)).slice(0, 5),
  );

  public readonly occupancyChartOptions = computed<EChartsCoreOption | null>(() => {
    const items = this.occupancy()
      .filter((o) => o.slots > 0)
      .map((o) => ({ label: o.name, value: Math.round(o.pct) }));
    return items.length > 0 ? buildGrowthBarOption(items, CHART_COLORS.primary, '%') : null;
  });

  /** Horizontal bars that grow left-to-right and settle — a distinct animation feel from the vertical elastic-bounce chart above. */
  public readonly occupancyRankingOptions = computed<EChartsCoreOption | null>(() => {
    const items = this.occupancy()
      .filter((o) => o.slots > 0)
      .map((o) => ({ label: o.name, value: Math.round(o.pct) }));
    return items.length > 0 ? buildRankingBarOption(items, CHART_COLORS.accent, '%') : null;
  });

  constructor() {
    this.activityService.getProviderOverview().subscribe({
      next: (overview) => {
        this.overview.set(overview);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Something went wrong loading your activities. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
