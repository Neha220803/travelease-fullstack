import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucidePlus } from '@ng-icons/lucide';
import { of, throwError } from 'rxjs';
import { MyTickets } from '@app/features/support/components/my-tickets/my-tickets';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import { SupportTicket } from '@app/features/support/services/support-ticket.models';

const TICKETS: SupportTicket[] = [
  {
    ticketId: 'aaaaaaaa-0000-0000-0000-000000000001',
    userId: 'u1',
    userName: 'Alice Traveler',
    category: 'HOTEL',
    subject: 'Room was dirty',
    description: 'Not cleaned before check-in.',
    status: 'OPEN',
    createdAt: '2026-07-09T00:00:00Z',
    updatedAt: '2026-07-09T00:00:00Z',
  },
];

async function setup(getMyTickets: () => ReturnType<SupportTicketService['getMyTickets']>) {
  await TestBed.configureTestingModule({
    imports: [MyTickets],
    providers: [
      provideRouter([]),
      provideIcons({ lucidePlus }),
      { provide: SupportTicketService, useValue: { getMyTickets } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(MyTickets);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture };
}

describe('MyTickets', () => {
  it('renders every ticket returned by the service', async () => {
    const { fixture } = await setup(() => of(TICKETS));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Room was dirty');
    expect(text).toContain('OPEN');
  });

  it('shows an empty state when there are no tickets', async () => {
    const { fixture } = await setup(() => of([]));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain("You haven't raised any support tickets yet.");
  });

  it('shows an error state when the request fails', async () => {
    const { fixture } = await setup(() => throwError(() => new Error('boom')));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Could not load your tickets.');
  });
});
