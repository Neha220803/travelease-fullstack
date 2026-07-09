import { RaiseTicketForm } from '@app/features/support/components/raise-ticket-form/raise-ticket-form';
import { MyTickets } from '@app/features/support/components/my-tickets/my-tickets';
import { TicketDetail } from '@app/features/support/components/ticket-detail/ticket-detail';
import { SUPPORT_ROUTES } from './support.routes';

describe('SUPPORT_ROUTES', () => {
  it('defines the contact, tickets, and ticket-detail routes', () => {
    expect(SUPPORT_ROUTES.map((r) => r.path)).toEqual(['contact', 'tickets', 'tickets/:id']);
  });

  it('lazily loads the real component for every route', async () => {
    expect(await SUPPORT_ROUTES[0].loadComponent!()).toBe(RaiseTicketForm);
    expect(await SUPPORT_ROUTES[1].loadComponent!()).toBe(MyTickets);
    expect(await SUPPORT_ROUTES[2].loadComponent!()).toBe(TicketDetail);
  });
});
