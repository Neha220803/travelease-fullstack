import { Component, inject, signal, DestroyRef } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { EChart } from '@app/shared/ui/echart/echart';
import type { EChartsCoreOption } from 'echarts/core';
import { DashboardService } from '@app/features/transport/services/dashboard.service';
import { ChartDataPoint, ProviderDashboardResponse } from '@app/features/transport/services/dashboard.models';
import { buildStatusPieOption, buildTrendLineOption } from '@app/features/transport/services/chart-helpers';
import { NotificationService } from '@app/features/notifications/services/notification.service';
import { NotificationResponse } from '@app/features/notifications/services/notification.models';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-transport-dashboard',
  imports: [HlmCardImports, HlmSkeletonImports, PageHeader, EChart, RouterLink, DatePipe],
  templateUrl: './transport-dashboard.html',
})
export class TransportDashboard {
  private readonly dashboardService = inject(DashboardService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly dashboard = signal<ProviderDashboardResponse | null>(null);
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  public readonly notifications = signal<NotificationResponse[]>([]);

  constructor() {
    this.load();
    this.fetchNotifications();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.dashboardService.getDashboard().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load dashboard data.');
        this.loading.set(false);
      },
    });
  }

  protected fetchNotifications(): void {
    this.notificationService.getNotifications()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notifs) => {
        this.notifications.set(notifs.slice(0, 5));
      });
  }

  protected revenueTrendOptions(points: ChartDataPoint[]): EChartsCoreOption {
    return buildTrendLineOption(points);
  }

  protected bookingTrendOptions(points: ChartDataPoint[]): EChartsCoreOption {
    return buildTrendLineOption(points);
  }

  protected tripStatusOptions(points: ChartDataPoint[]): EChartsCoreOption {
    return buildStatusPieOption(points);
  }
}
