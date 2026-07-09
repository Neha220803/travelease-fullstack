import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import { of, throwError } from 'rxjs';
import { TicketDetail } from '@app/features/support/components/ticket-detail/ticket-detail';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import { SupportTicketDetail } from '@app/features/support/services/support-ticket.models';

const DETAIL: SupportTicketDetail = {
  ticket: {
    ticketId: 'aaaaaaaa-0000-0000-0000-000000000001',
    userId: 'u1',
    userName: 'Alice Traveler',
    category: 'HOTEL',
    subject: 'Room was dirty',
    description: 'Not cleaned before check-in.',
    status: 'IN_PROGRESS',
    createdAt: '2026-07-09T00:00:00Z',
    updatedAt: '2026-07-09T01:00:00Z',
  },
  replies: [{ replyId: 'r1', message: "We're looking into this.", createdAt: '2026-07-09T01:00:00Z' }],
};

async function setup(getMyTicket: () => ReturnType<SupportTicketService['getMyTicket']>, ticketId = DETAIL.ticket.ticketId) {
  await TestBed.configureTestingModule({
    imports: [TicketDetail],
    providers: [
      provideRouter([]),
      provideIcons({ lucideArrowLeft }),
      { provide: SupportTicketService, useValue: { getMyTicket } },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: ticketId }) } },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(TicketDetail);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture };
}

describe('TicketDetail', () => {
  it('renders the ticket description, status, and replies', async () => {
    const { fixture } = await setup(() => of(DETAIL));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Room was dirty');
    expect(text).toContain('Not cleaned before check-in.');
    expect(text).toContain('IN_PROGRESS');
    expect(text).toContain("We're looking into this.");
  });

  it('shows a not-found state when the ticket cannot be loaded', async () => {
    const { fixture } = await setup(() => throwError(() => new Error('404')));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ticket not found.');
  });

  it('shows a no-replies message when the thread is empty', async () => {
    const { fixture } = await setup(() => of({ ...DETAIL, replies: [] }));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No replies yet.');
  });
});
