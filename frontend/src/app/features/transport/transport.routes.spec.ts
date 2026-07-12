import { AppShell } from '@app/shared/layout/app-shell/app-shell';
import { authGuard } from '@app/core/auth/auth.guard';
import { TransportDashboard } from '@app/features/transport/components/transport-dashboard/transport-dashboard';
import { ManageVehicles } from '@app/features/transport/components/manage-vehicles/manage-vehicles';
import { StaffManagement } from '@app/features/transport/components/staff-management/staff-management';
import { ManageSchedules } from '@app/features/transport/components/manage-schedules/manage-schedules';
import { BusTrips } from '@app/features/transport/components/bus-trips/bus-trips';
import { BookingAnalytics } from '@app/features/transport/components/booking-analytics/booking-analytics';
import { TransportReports } from '@app/features/transport/components/transport-reports/transport-reports';
import { TRANSPORT_ROUTES } from './transport.routes';

describe('TRANSPORT_ROUTES', () => {
  it('wraps the transport pages in the AppShell with the transport role', async () => {
    expect(TRANSPORT_ROUTES).toHaveLength(1);
    const shellRoute = TRANSPORT_ROUTES[0];
    expect(shellRoute.path).toBe('');
    expect(shellRoute.data?.['role']).toBe('transport');
    expect(shellRoute.canActivate).toEqual([authGuard]);
    const loaded = await shellRoute.loadComponent!();
    expect(loaded).toBe(AppShell);
  });

  it('defines all transport paths as children', () => {
    const children = TRANSPORT_ROUTES[0].children ?? [];
    expect(children.map((r) => r.path)).toEqual([
      '',
      'vehicles',
      'staff',
      'schedules',
      'trips',
      'bookings',
      'reports',
      'notifications',
    ]);
  });

  it('lazily loads the real component for each child route', async () => {
    const children = TRANSPORT_ROUTES[0].children ?? [];
    const expected = [
      TransportDashboard,
      ManageVehicles,
      StaffManagement,
      ManageSchedules,
      BusTrips,
      BookingAnalytics,
      TransportReports,
    ];
    for (let i = 0; i < expected.length; i++) {
      expect(await children[i].loadComponent!()).toBe(expected[i]);
    }
  });

  it('lazily loads the notifications route group', async () => {
    const children = TRANSPORT_ROUTES[0].children ?? [];
    const notificationsChild = children.find((r) => r.path === 'notifications')!;
    const { NOTIFICATIONS_ROUTES } = await import('@app/features/notifications/notifications.routes');
    expect(await notificationsChild.loadChildren!()).toBe(NOTIFICATIONS_ROUTES);
  });
});
