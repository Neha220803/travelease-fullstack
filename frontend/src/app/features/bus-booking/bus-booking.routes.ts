import { Routes } from '@angular/router';

export const BUS_BOOKING_ROUTES: Routes = [
  { path: '', loadComponent: () => import('@app/features/bus-booking/components/my-bookings/my-bookings').then((m) => m.MyBookings) },
  { path: 'new', loadComponent: () => import('@app/features/bus-booking/components/booking-flow/booking-flow').then((m) => m.BookingFlow) },
  {
    path: 'confirmation/:id',
    loadComponent: () =>
      import('@app/features/bus-booking/components/booking-confirmation/booking-confirmation').then((m) => m.BookingConfirmation),
  },
  { path: ':id/ticket', loadComponent: () => import('@app/features/bus-booking/components/ticket-display/ticket-display').then((m) => m.TicketDisplay) },
  { path: ':id', loadComponent: () => import('@app/features/bus-booking/components/booking-detail/booking-detail').then((m) => m.BookingDetail) },
];
