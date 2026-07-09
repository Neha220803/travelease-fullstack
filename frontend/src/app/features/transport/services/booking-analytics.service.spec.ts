import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BookingAnalyticsService } from '@app/features/transport/services/booking-analytics.service';
import { BookingAnalyticsResponse, RevenueAnalyticsResponse } from '@app/features/transport/services/booking-analytics.models';

const BOOKING_ANALYTICS: BookingAnalyticsResponse = {
  providerId: 101, rangeStart: '2026-07-01', rangeEnd: '2026-07-31',
  totalBookings: 100, confirmedBookings: 90, cancelledBookings: 10, cancellationRate: 10,
  peakBookingHours: [], peakTravelDays: [], bookingGrowth: [], bookingStatusDistribution: [],
};
const REVENUE_ANALYTICS: RevenueAnalyticsResponse = {
  providerId: 101, rangeStart: '2026-07-01', rangeEnd: '2026-07-31',
  dailyRevenue: 5000, weeklyRevenue: 35000, monthlyRevenue: 150000, totalRevenue: 2000000, rangeRevenue: 150000,
  revenueGrowthPercent: 5, averageBookingValue: 1500, averageFare: 1200, couponUsageCount: 3,
  totalCouponDiscount: 900, totalDiscountAmount: 900, dailyRevenueTrend: [], weeklyRevenueTrend: [], monthlyRevenueTrend: [],
};

describe('BookingAnalyticsService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return { service: TestBed.inject(BookingAnalyticsService), httpMock: TestBed.inject(HttpTestingController) };
  }

  it('fetches booking analytics for a date range with no providerId param', async () => {
    const { service, httpMock } = await setup();

    let result: BookingAnalyticsResponse | undefined;
    service.getBookingAnalytics('2026-07-01', '2026-07-31').subscribe((data) => (result = data));

    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/analytics/bookings');
    expect(req.request.params.get('from')).toBe('2026-07-01');
    expect(req.request.params.get('to')).toBe('2026-07-31');
    expect(req.request.params.has('providerId')).toBe(false);
    req.flush({ success: true, data: BOOKING_ANALYTICS, message: null, error: null });

    expect(result).toEqual(BOOKING_ANALYTICS);
  });

  it('fetches revenue analytics for the same date range contract', async () => {
    const { service, httpMock } = await setup();

    let result: RevenueAnalyticsResponse | undefined;
    service.getRevenueAnalytics('2026-07-01', '2026-07-31').subscribe((data) => (result = data));

    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/analytics/revenue');
    req.flush({ success: true, data: REVENUE_ANALYTICS, message: null, error: null });

    expect(result).toEqual(REVENUE_ANALYTICS);
  });
});
