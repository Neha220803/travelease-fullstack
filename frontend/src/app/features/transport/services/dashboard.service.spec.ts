import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardService } from '@app/features/transport/services/dashboard.service';
import { ProviderDashboardResponse } from '@app/features/transport/services/dashboard.models';

const DASHBOARD_RESPONSE: ProviderDashboardResponse = {
  providerId: 101,
  todayBookings: { title: 'Today Bookings', value: 12, unit: 'bookings', changePercent: 5, trend: 'UP', icon: 'ticket' },
  todayRevenue: { title: 'Today Revenue', value: 24000, unit: 'INR', changePercent: 3, trend: 'UP', icon: 'wallet' },
  weeklyRevenue: { title: 'Weekly Revenue', value: 168000, unit: 'INR', changePercent: 2, trend: 'STABLE', icon: 'wallet' },
  monthlyRevenue: { title: 'Monthly Revenue', value: 720000, unit: 'INR', changePercent: 8, trend: 'UP', icon: 'wallet' },
  totalRevenue: { title: 'Total Revenue', value: 4200000, unit: 'INR', changePercent: 0, trend: 'STABLE', icon: 'wallet' },
  activeTrips: { title: 'Active Trips', value: 4, unit: 'trips', changePercent: 0, trend: 'STABLE', icon: 'bus' },
  runningTrips: { title: 'Running Trips', value: 2, unit: 'trips', changePercent: 0, trend: 'STABLE', icon: 'bus' },
  completedTrips: { title: 'Completed Trips', value: 186, unit: 'trips', changePercent: 4, trend: 'UP', icon: 'check' },
  cancelledTrips: { title: 'Cancelled Trips', value: 3, unit: 'trips', changePercent: -1, trend: 'DOWN', icon: 'x' },
  delayedTrips: { title: 'Delayed Trips', value: 1, unit: 'trips', changePercent: 0, trend: 'STABLE', icon: 'clock' },
  totalPassengers: { title: 'Total Passengers', value: 1284, unit: 'passengers', changePercent: 6, trend: 'UP', icon: 'users' },
  fleetAvailability: { title: 'Fleet Availability', value: 82, unit: '%', changePercent: 0, trend: 'STABLE', icon: 'bus' },
  revenueTrend: [{ label: 'Mon', value: 10000, category: 'revenue', color: null }],
  bookingTrend: [{ label: 'Mon', value: 5, category: 'bookings', color: null }],
  tripStatusDistribution: [{ label: 'RUNNING', value: 2, category: 'status', color: null }],
  fleetSummary: { totalBuses: 8, activeBuses: 6, maintenanceBuses: 2 },
  staffSummary: { activeDrivers: 5, activeConductors: 5 },
  maintenanceSummary: { upcomingCount: 2, nextItems: [] },
  topRoutes: [{ routeId: 1, source: 'Bengaluru', destination: 'Goa', bookingCount: 40, revenue: 300000 }],
};

describe('DashboardService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return {
      service: TestBed.inject(DashboardService),
      httpMock: TestBed.inject(HttpTestingController),
    };
  }

  it('fetches the provider dashboard without a providerId query param', async () => {
    const { service, httpMock } = await setup();

    let result: ProviderDashboardResponse | undefined;
    service.getDashboard().subscribe((data) => (result = data));

    const req = httpMock.expectOne('http://localhost:8080/api/analytics/dashboard');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('providerId')).toBe(false);
    req.flush({ success: true, data: DASHBOARD_RESPONSE, message: null, error: null });

    expect(result).toEqual(DASHBOARD_RESPONSE);
  });
});
