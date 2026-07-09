import { Routes } from '@angular/router';

export const SUPPORT_ROUTES: Routes = [
  {
    path: 'contact',
    loadComponent: () =>
      import('@app/features/support/components/raise-ticket-form/raise-ticket-form').then(
        (m) => m.RaiseTicketForm,
      ),
  },
  {
    path: 'tickets',
    loadComponent: () =>
      import('@app/features/support/components/my-tickets/my-tickets').then((m) => m.MyTickets),
  },
  {
    path: 'tickets/:id',
    loadComponent: () =>
      import('@app/features/support/components/ticket-detail/ticket-detail').then(
        (m) => m.TicketDetail,
      ),
  },
];
