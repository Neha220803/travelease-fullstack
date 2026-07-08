import { Component, computed, inject, signal } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { EChart } from '@app/shared/ui/echart/echart';
import { CHART_COLORS } from '@app/shared/ui/echart/echart-theme';
import { buildRankingBarOption } from '@app/shared/ui/echart/ranking-bar-chart';
import { ActivityService } from '@app/features/activity/services/activity.service';
import { ActivityBooking, ActivityOverview } from '@app/features/activity/services/activity.models';
import type { EChartsCoreOption } from 'echarts/core';

interface RevenueView {
  id: string;
  name: string;
  revenue: number;
  pct: number;
}

export function isRevenueEligible(status: ActivityBooking['status']): boolean {
  return status !== 'CANCELLED';
}

export function computeRevenueByActivity(overview: ActivityOverview[]): RevenueView[] {
  const revenues = overview.map((o) =>
    o.bookings.filter((b) => isRevenueEligible(b.status)).reduce((sum, b) => sum + b.totalAmount, 0),
  );
  const max = Math.max(0, ...revenues);
  return overview.map((o, i) => ({
    id: o.activity.activityId,
    name: o.activity.activityName,
    revenue: revenues[i],
    pct: max > 0 ? (revenues[i] / max) * 100 : 0,
  }));
}

@Component({
  selector: 'app-activity-reports',
  imports: [HlmCardImports, PageHeader, EChart],
  templateUrl: './activity-reports.html',
})
export class ActivityReports {
  private readonly activityService = inject(ActivityService);

  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  private readonly overview = signal<ActivityOverview[]>([]);

  private readonly allBookings = computed(() => this.overview().flatMap((o) => o.bookings));

  public readonly totalRevenue = computed(() =>
    this.allBookings()
      .filter((b) => isRevenueEligible(b.status))
      .reduce((sum, b) => sum + b.totalAmount, 0),
  );

  public readonly totalBookings = computed(() => this.allBookings().length);

  public readonly avgBookingValue = computed(() =>
    this.totalBookings() > 0 ? Math.round(this.totalRevenue() / this.totalBookings()) : 0,
  );

  public readonly attendanceRate = computed(() => {
    const attended = this.allBookings().filter((b) => b.status === 'ATTENDED').length;
    const noShow = this.allBookings().filter((b) => b.status === 'NO_SHOW').length;
    const total = attended + noShow;
    return total > 0 ? Math.round((attended / total) * 100) : null;
  });

  public readonly revenueByActivity = computed<RevenueView[]>(() =>
    computeRevenueByActivity(this.overview()),
  );

  public readonly revenueChartOptions = computed<EChartsCoreOption | null>(() => {
    const items = this.revenueByActivity()
      .filter((r) => r.revenue > 0)
      .map((r) => ({ label: r.name, value: r.revenue }));
    return items.length > 0 ? buildRankingBarOption(items, CHART_COLORS.accent) : null;
  });

  constructor() {
    this.activityService.getProviderOverview().subscribe({
      next: (overview) => {
        this.overview.set(overview);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Something went wrong loading your reports. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
