import { Routes } from '@angular/router';
import { authGuard } from '@app/core/auth/auth.guard';
import { Role } from '@app/core/auth/auth.models';

export const TRANSPORT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('@app/shared/layout/app-shell/app-shell').then((m) => m.AppShell),
    data: { role: 'transport' },
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@app/features/transport/components/transport-dashboard/transport-dashboard').then(
            (m) => m.TransportDashboard,
          ),
      },
      {
        path: 'vehicles',
        loadComponent: () =>
          import('@app/features/transport/components/manage-vehicles/manage-vehicles').then(
            (m) => m.ManageVehicles,
          ),
      },
      {
        path: 'staff',
        loadComponent: () =>
          import('@app/features/transport/components/staff-management/staff-management').then(
            (m) => m.StaffManagement,
          ),
      },
      {
        path: 'schedules',
        loadComponent: () =>
          import('@app/features/transport/components/manage-schedules/manage-schedules').then(
            (m) => m.ManageSchedules,
          ),
      },
      {
        path: 'trips',
        loadComponent: () =>
          import('@app/features/transport/components/bus-trips/bus-trips').then((m) => m.BusTrips),
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('@app/features/transport/components/booking-analytics/booking-analytics').then(
            (m) => m.BookingAnalytics,
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('@app/features/transport/components/transport-reports/transport-reports').then(
            (m) => m.TransportReports,
          ),
      },
      {
        path: 'notifications',
        loadChildren: () =>
          import('@app/features/notifications/notifications.routes').then(
            (m) => m.NOTIFICATIONS_ROUTES,
          ),
      },
      {
        path: 'support-tickets',
        loadComponent: () =>
          import('@app/features/support/components/provider-support-tickets/provider-support-tickets').then((m) => m.ProviderSupportTickets),
        data: { role: 'transport' as Role },
      },
    ],
  },
];
