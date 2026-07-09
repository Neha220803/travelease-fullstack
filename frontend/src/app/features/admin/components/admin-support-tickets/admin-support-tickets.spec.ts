import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminSupportTickets } from '@app/features/admin/components/admin-support-tickets/admin-support-tickets';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import { SupportTicket, SupportTicketDetail } from '@app/features/support/services/support-ticket.models';

// jsdom doesn't implement these browser APIs; the Spartan hlm-select component's
// active-item tracking calls them internally whenever a select with a pre-set value renders.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === 'undefined') {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

const TICKET: SupportTicket = {
  ticketId: 'aaaaaaaa-0000-0000-0000-000000000001',
  userId: 'u1',
  userName: 'Alice Traveler',
  category: 'HOTEL',
  subject: 'Room was dirty',
  description: 'Not cleaned before check-in.',
  status: 'OPEN',
  createdAt: '2026-07-09T00:00:00Z',
  updatedAt: '2026-07-09T00:00:00Z',
};

const DETAIL: SupportTicketDetail = { ticket: TICKET, replies: [] };

async function setup() {
  const getAllTickets = vi.fn().mockReturnValue(of([TICKET]));
  const getTicketForAdmin = vi.fn().mockReturnValue(of(DETAIL));
  const addReply = vi.fn().mockReturnValue(of({ replyId: 'r1', message: 'On it', createdAt: '2026-07-09T02:00:00Z' }));
  const updateStatus = vi.fn().mockReturnValue(of({ ...TICKET, status: 'RESOLVED' }));

  await TestBed.configureTestingModule({
    imports: [AdminSupportTickets],
    providers: [
      {
        provide: SupportTicketService,
        useValue: { getAllTickets, getTicketForAdmin, addReply, updateStatus },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(AdminSupportTickets);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, getAllTickets, getTicketForAdmin, addReply, updateStatus };
}

function clickTicketRow(el: HTMLElement, subject: string): void {
  const button = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(subject));
  (button as HTMLButtonElement).click();
}

describe('AdminSupportTickets', () => {
  it('loads and renders all tickets on init with no filters', async () => {
    const { fixture, getAllTickets } = await setup();
    expect(getAllTickets).toHaveBeenCalledWith(undefined, undefined);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Room was dirty');
    expect(text).toContain('Alice Traveler');
  });

  it('loads a ticket detail panel when a ticket row is clicked', async () => {
    const { fixture, getTicketForAdmin } = await setup();
    const el = fixture.nativeElement as HTMLElement;

    clickTicketRow(el, 'Room was dirty');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getTicketForAdmin).toHaveBeenCalledWith(TICKET.ticketId);
    expect(el.textContent).toContain('Room was dirty');
    expect(el.textContent).not.toContain('Select a ticket to view details.');
  });

  it('posts a reply and appends it to the thread', async () => {
    const { fixture, addReply } = await setup();
    const el = fixture.nativeElement as HTMLElement;

    clickTicketRow(el, 'Room was dirty');
    await fixture.whenStable();
    fixture.detectChanges();

    const textarea = el.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'On it';
    const form = el.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(addReply).toHaveBeenCalledWith(TICKET.ticketId, 'On it');
    expect(el.textContent).toContain('On it');
  });

  it('updates the ticket status and refreshes the list', async () => {
    const { fixture, updateStatus, getAllTickets } = await setup();
    const el = fixture.nativeElement as HTMLElement;

    clickTicketRow(el, 'Room was dirty');
    await fixture.whenStable();
    fixture.detectChanges();
    getAllTickets.mockClear();

    (fixture.componentInstance as unknown as { onStatusChange: (v: string) => void }).onStatusChange('RESOLVED');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(updateStatus).toHaveBeenCalledWith(TICKET.ticketId, 'RESOLVED');
    expect(getAllTickets).toHaveBeenCalled();
  });
});
