import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TransportDashboard } from '@app/features/transport/components/transport-dashboard/transport-dashboard';
import { DashboardService } from '@app/features/transport/services/dashboard.service';
import { ProviderDashboardResponse } from '@app/features/transport/services/dashboard.models';
import { provideRouter } from '@angular/router';
import { NotificationService } from '@app/features/notifications/services/notification.service';

const KPI = { title: 'x', value: 1, unit: 'u', changePercent: 0, trend: 'STABLE' as const, icon: 'i' };
const DASHBOARD: ProviderDashboardResponse = {
  providerId: 101,
  todayBookings: KPI, todayRevenue: KPI, weeklyRevenue: KPI, monthlyRevenue: KPI, totalRevenue: KPI,
  activeTrips: KPI, runningTrips: KPI, completedTrips: KPI, cancelledTrips: KPI, delayedTrips: KPI,
  totalPassengers: KPI, fleetAvailability: KPI,
  revenueTrend: [], bookingTrend: [], tripStatusDistribution: [],
  fleetSummary: { totalBuses: 8, activeBuses: 6, maintenanceBuses: 2 },
  staffSummary: { activeDrivers: 5, activeConductors: 5 },
  maintenanceSummary: { upcomingCount: 0, nextItems: [] },
  topRoutes: [],
};

async function setup(dashboardService: Partial<DashboardService>) {
  await TestBed.configureTestingModule({
    imports: [TransportDashboard],
    providers: [
      provideRouter([]),
      { provide: DashboardService, useValue: dashboardService },
      { provide: NotificationService, useValue: { getNotifications: () => of([]) } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(TransportDashboard);
  fixture.detectChanges();
  return { fixture };
}

describe('TransportDashboard', () => {
  it('loads and exposes the dashboard data as a signal', async () => {
    const { fixture } = await setup({ getDashboard: () => of(DASHBOARD) });
    const component = fixture.componentInstance;
    expect(component.dashboard()).toEqual(DASHBOARD);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('surfaces a read error without throwing', async () => {
    const { fixture } = await setup({
      getDashboard: () => throwError(() => new HttpErrorResponse({ status: 500 })),
    });
    const component = fixture.componentInstance;
    expect(component.dashboard()).toBeNull();
    expect(component.error()).toBe('Failed to load dashboard data.');
    expect(component.loading()).toBe(false);
  });
});
