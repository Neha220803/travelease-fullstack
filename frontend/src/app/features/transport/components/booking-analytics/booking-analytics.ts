import { Component, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { EChart } from '@app/shared/ui/echart/echart';
import { BookingAnalyticsService } from '@app/features/transport/services/booking-analytics.service';
import { BookingAnalyticsResponse, RevenueAnalyticsResponse } from '@app/features/transport/services/booking-analytics.models';
import { buildTrendLineOption } from '@app/features/transport/services/chart-helpers';

@Component({
  selector: 'app-booking-analytics',
  imports: [HlmCardImports, PageHeader, EChart],
  templateUrl: './booking-analytics.html',
})
export class BookingAnalytics {
  private readonly analyticsService = inject(BookingAnalyticsService);

  public readonly bookingAnalytics = signal<BookingAnalyticsResponse | null>(null);
  public readonly revenueAnalytics = signal<RevenueAnalyticsResponse | null>(null);
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  public readonly from = signal<string | undefined>(undefined);
  public readonly to = signal<string | undefined>(undefined);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      booking: this.analyticsService.getBookingAnalytics(this.from(), this.to()),
      revenue: this.analyticsService.getRevenueAnalytics(this.from(), this.to()),
    }).subscribe({
      next: ({ booking, revenue }) => {
        this.bookingAnalytics.set(booking);
        this.revenueAnalytics.set(revenue);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load booking analytics.');
        this.loading.set(false);
      },
    });
  }

  applyDateRange(from: string | undefined, to: string | undefined): void {
    this.from.set(from);
    this.to.set(to);
    this.load();
  }

  protected trendOptions = buildTrendLineOption;
}
