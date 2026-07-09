import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { BookingAnalytics } from '@app/features/transport/components/booking-analytics/booking-analytics';
import { BookingAnalyticsService } from '@app/features/transport/services/booking-analytics.service';
import { BookingAnalyticsResponse, RevenueAnalyticsResponse } from '@app/features/transport/services/booking-analytics.models';

const BOOKING: BookingAnalyticsResponse = {
  providerId: 101, rangeStart: '2026-07-01', rangeEnd: '2026-07-31',
  totalBookings: 100, confirmedBookings: 90, cancelledBookings: 10, cancellationRate: 10,
  peakBookingHours: [], peakTravelDays: [], bookingGrowth: [], bookingStatusDistribution: [],
};
const REVENUE: RevenueAnalyticsResponse = {
  providerId: 101, rangeStart: '2026-07-01', rangeEnd: '2026-07-31',
  dailyRevenue: 5000, weeklyRevenue: 35000, monthlyRevenue: 150000, totalRevenue: 2000000, rangeRevenue: 150000,
  revenueGrowthPercent: 5, averageBookingValue: 1500, averageFare: 1200, couponUsageCount: 3,
  totalCouponDiscount: 900, totalDiscountAmount: 900, dailyRevenueTrend: [], weeklyRevenueTrend: [], monthlyRevenueTrend: [],
};

async function setup(service: Partial<BookingAnalyticsService>) {
  await TestBed.configureTestingModule({
    imports: [BookingAnalytics],
    providers: [{ provide: BookingAnalyticsService, useValue: service }],
  }).compileComponents();
  const fixture = TestBed.createComponent(BookingAnalytics);
  fixture.detectChanges();
  return { fixture };
}

describe('BookingAnalytics', () => {
  it('loads booking and revenue analytics together on init', async () => {
    const { fixture } = await setup({
      getBookingAnalytics: () => of(BOOKING),
      getRevenueAnalytics: () => of(REVENUE),
    });
    expect(fixture.componentInstance.bookingAnalytics()).toEqual(BOOKING);
    expect(fixture.componentInstance.revenueAnalytics()).toEqual(REVENUE);
  });

  it('surfaces a read error inline without throwing', async () => {
    const { fixture } = await setup({
      getBookingAnalytics: () => throwError(() => new HttpErrorResponse({ status: 500 })),
      getRevenueAnalytics: () => of(REVENUE),
    });
    expect(fixture.componentInstance.error()).toBe('Failed to load booking analytics.');
  });
});
