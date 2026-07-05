import { Routes } from '@angular/router';
import { authGuard } from '@app/core/auth/auth.guard';
import { AuthLayout } from '@app/layouts/auth-layout/auth-layout';
import { AppShell } from '@app/layouts/app-shell/app-shell';
import { AdminShell } from '@app/layouts/admin-shell/admin-shell';
import { HotelShell } from '@app/layouts/hotel-shell/hotel-shell';
import { TransportShell } from '@app/layouts/transport-shell/transport-shell';
import { ActivityShell } from '@app/layouts/activity-shell/activity-shell';

export const routes: Routes = [
  // ═══════════ Auth ═══════════
  {
    path: '',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('@app/features/auth/login/login').then(m => m.Login),
        title: 'Sign In — TravelEase',
      },
      {
        path: 'register',
        loadComponent: () =>
          import('@app/features/auth/register/register').then(m => m.Register),
        title: 'Create Account — TravelEase',
      },
    ],
  },

  // ═══════════ Traveler ═══════════
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('@app/features/traveler/dashboard/dashboard').then(m => m.Dashboard),
        title: 'Dashboard — TravelEase',
      },
      {
        path: 'trips',
        loadComponent: () =>
          import('@app/features/trips/trips-list/trips-list').then(m => m.TripsList),
        title: 'My Trips — TravelEase',
      },
      {
        path: 'trips/:tripId',
        loadComponent: () =>
          import('@app/features/trips/trip-detail/trip-detail').then(m => m.TripDetail),
        title: 'Trip Details — TravelEase',
      },
      {
        path: 'trips/:tripId/expenses',
        loadComponent: () =>
          import('@app/features/trips/trip-expenses/trip-expenses').then(m => m.TripExpenses),
        title: 'Expenses — TravelEase',
      },
      {
        path: 'trips/:tripId/budget',
        loadComponent: () =>
          import('@app/features/trips/trip-budget/trip-budget').then(m => m.TripBudget),
        title: 'Budget — TravelEase',
      },
      {
        path: 'trips/:tripId/settlements',
        loadComponent: () =>
          import('@app/features/trips/trip-settlements/trip-settlements').then(m => m.TripSettlements),
        title: 'Settlements — TravelEase',
      },
      {
        path: 'invitations',
        loadComponent: () =>
          import('@app/features/traveler/invitations/invitations').then(m => m.Invitations),
        title: 'Invitations — TravelEase',
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('@app/features/traveler/notifications/notifications').then(m => m.Notifications),
        title: 'Notifications — TravelEase',
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('@app/features/traveler/profile/profile').then(m => m.Profile),
        title: 'Profile — TravelEase',
      },
    ],
  },

  // ═══════════ Admin ═══════════
  {
    path: 'admin',
    component: AdminShell,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@app/features/admin/dashboard/admin-dashboard').then(m => m.AdminDashboard),
        title: 'Admin Dashboard — TravelEase',
      },
      {
        path: 'users',
        loadComponent: () =>
          import('@app/features/admin/users/admin-users').then(m => m.AdminUsers),
        title: 'Users — Admin',
      },
      {
        path: 'trips',
        loadComponent: () =>
          import('@app/features/admin/trips/admin-trips').then(m => m.AdminTrips),
        title: 'All Trips — Admin',
      },
      {
        path: 'hotels',
        loadComponent: () =>
          import('@app/features/admin/hotels/admin-hotels').then(m => m.AdminHotels),
        title: 'Hotels — Admin',
      },
      {
        path: 'buses',
        loadComponent: () =>
          import('@app/features/admin/buses/admin-buses').then(m => m.AdminBuses),
        title: 'Transport — Admin',
      },
      {
        path: 'partners',
        loadComponent: () =>
          import('@app/features/admin/partners/admin-partners').then(m => m.AdminPartners),
        title: 'Partners — Admin',
      },
      {
        path: 'approvals',
        loadComponent: () =>
          import('@app/features/admin/partners/admin-partners').then(m => m.AdminPartners),
        title: 'Approvals — Admin',
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('@app/features/admin/reports/admin-reports').then(m => m.AdminReports),
        title: 'Reports — Admin',
      },
      {
        path: 'route-analytics',
        loadComponent: () =>
          import('@app/features/admin/route-analytics/admin-route-analytics').then(m => m.AdminRouteAnalytics),
        title: 'Route Analytics — Admin',
      },
      {
        path: 'funnel',
        loadComponent: () =>
          import('@app/features/admin/funnel/admin-funnel').then(m => m.AdminFunnel),
        title: 'Conversion Funnel — Admin',
      },
    ],
  },

  // ═══════════ Hotel Provider ═══════════
  {
    path: 'hotel',
    component: HotelShell,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@app/features/hotel-provider/dashboard/hotel-dashboard').then(m => m.HotelDashboard),
        title: 'Hotel Dashboard — TravelEase',
      },
      {
        path: 'properties',
        loadComponent: () =>
          import('@app/features/hotel-provider/dashboard/hotel-dashboard').then(m => m.HotelDashboard),
        title: 'Properties — Hotel Provider',
      },
      {
        path: 'rooms',
        loadComponent: () =>
          import('@app/features/hotel-provider/dashboard/hotel-dashboard').then(m => m.HotelDashboard),
        title: 'Rooms — Hotel Provider',
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('@app/features/hotel-provider/dashboard/hotel-dashboard').then(m => m.HotelDashboard),
        title: 'Bookings — Hotel Provider',
      },
      {
        path: 'reviews',
        loadComponent: () =>
          import('@app/features/hotel-provider/dashboard/hotel-dashboard').then(m => m.HotelDashboard),
        title: 'Reviews — Hotel Provider',
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('@app/features/hotel-provider/dashboard/hotel-dashboard').then(m => m.HotelDashboard),
        title: 'Reports — Hotel Provider',
      },
    ],
  },

  // ═══════════ Transport Provider ═══════════
  {
    path: 'transport',
    component: TransportShell,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@app/features/transport-provider/dashboard/transport-dashboard').then(m => m.TransportDashboard),
        title: 'Transport Dashboard — TravelEase',
      },
      {
        path: 'vehicles',
        loadComponent: () =>
          import('@app/features/transport-provider/dashboard/transport-dashboard').then(m => m.TransportDashboard),
        title: 'Vehicles — Transport Provider',
      },
      {
        path: 'routes',
        loadComponent: () =>
          import('@app/features/transport-provider/dashboard/transport-dashboard').then(m => m.TransportDashboard),
        title: 'Routes — Transport Provider',
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('@app/features/transport-provider/dashboard/transport-dashboard').then(m => m.TransportDashboard),
        title: 'Bookings — Transport Provider',
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('@app/features/transport-provider/dashboard/transport-dashboard').then(m => m.TransportDashboard),
        title: 'Reports — Transport Provider',
      },
    ],
  },

  // ═══════════ Activity Provider ═══════════
  {
    path: 'activity',
    component: ActivityShell,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@app/features/activity-provider/dashboard/activity-dashboard').then(m => m.ActivityDashboard),
        title: 'Activity Dashboard — TravelEase',
      },
      {
        path: 'activities',
        loadComponent: () =>
          import('@app/features/activity-provider/dashboard/activity-dashboard').then(m => m.ActivityDashboard),
        title: 'Activities — Activity Provider',
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('@app/features/activity-provider/dashboard/activity-dashboard').then(m => m.ActivityDashboard),
        title: 'Bookings — Activity Provider',
      },
      {
        path: 'capacity',
        loadComponent: () =>
          import('@app/features/activity-provider/dashboard/activity-dashboard').then(m => m.ActivityDashboard),
        title: 'Capacity — Activity Provider',
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('@app/features/activity-provider/dashboard/activity-dashboard').then(m => m.ActivityDashboard),
        title: 'Reports — Activity Provider',
      },
    ],
  },

  // ═══════════ Fallback ═══════════
  {
    path: '**',
    redirectTo: 'login',
  },
];
