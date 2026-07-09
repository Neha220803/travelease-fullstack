import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import { CreateTicketPayload, SupportTicket } from '@app/features/support/services/support-ticket.models';

const SAMPLE_TICKET: SupportTicket = {
  ticketId: 'aaaaaaaa-0000-0000-0000-000000000001',
  userId: 'bbbbbbbb-0000-0000-0000-000000000002',
  userName: 'Alice Traveler',
  category: 'HOTEL',
  subject: 'Room was dirty',
  description: 'Not cleaned before check-in.',
  status: 'OPEN',
  createdAt: '2026-07-09T00:00:00Z',
  updatedAt: '2026-07-09T00:00:00Z',
};

describe('SupportTicketService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return {
      service: TestBed.inject(SupportTicketService),
      httpMock: TestBed.inject(HttpTestingController),
    };
  }

  it("creates a ticket and unwraps the response", async () => {
    const { service, httpMock } = await setup();

    const payload: CreateTicketPayload = {
      category: 'HOTEL',
      subject: 'Room was dirty',
      description: 'Not cleaned before check-in.',
    };

    let result: SupportTicket | undefined;
    service.createTicket(payload).subscribe((ticket) => (result = ticket));

    const req = httpMock.expectOne('http://localhost:8080/api/support/tickets');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true, data: SAMPLE_TICKET, message: 'Support ticket created', error: null });

    expect(result).toEqual(SAMPLE_TICKET);
  });

  it("fetches the current user's tickets", async () => {
    const { service, httpMock } = await setup();

    let result: SupportTicket[] | undefined;
    service.getMyTickets().subscribe((tickets) => (result = tickets));

    const req = httpMock.expectOne('http://localhost:8080/api/support/tickets');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [SAMPLE_TICKET], message: 'Support tickets retrieved', error: null });

    expect(result).toEqual([SAMPLE_TICKET]);
  });

  it('fetches all tickets with category and status query params', async () => {
    const { service, httpMock } = await setup();

    let result: SupportTicket[] | undefined;
    service.getAllTickets('HOTEL', 'OPEN').subscribe((tickets) => (result = tickets));

    const req = httpMock.expectOne(
      'http://localhost:8080/api/admin/support/tickets?category=HOTEL&status=OPEN',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [SAMPLE_TICKET], message: 'Support tickets retrieved', error: null });

    expect(result).toEqual([SAMPLE_TICKET]);
  });

  it('fetches all tickets with no query params when no filters are given', async () => {
    const { service, httpMock } = await setup();

    service.getAllTickets().subscribe();

    const req = httpMock.expectOne('http://localhost:8080/api/admin/support/tickets');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [], message: 'Support tickets retrieved', error: null });
  });

  it('posts a reply and unwraps the response', async () => {
    const { service, httpMock } = await setup();

    let result: unknown;
    service.addReply(SAMPLE_TICKET.ticketId, 'We are looking into this.').subscribe((reply) => (result = reply));

    const req = httpMock.expectOne(
      `http://localhost:8080/api/admin/support/tickets/${SAMPLE_TICKET.ticketId}/replies`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ message: 'We are looking into this.' });
    req.flush({
      success: true,
      data: { replyId: 'r1', message: 'We are looking into this.', createdAt: '2026-07-09T01:00:00Z' },
      message: 'Reply added',
      error: null,
    });

    expect(result).toEqual({ replyId: 'r1', message: 'We are looking into this.', createdAt: '2026-07-09T01:00:00Z' });
  });

  it('patches the status and unwraps the response', async () => {
    const { service, httpMock } = await setup();

    let result: SupportTicket | undefined;
    service.updateStatus(SAMPLE_TICKET.ticketId, 'RESOLVED').subscribe((ticket) => (result = ticket));

    const req = httpMock.expectOne(
      `http://localhost:8080/api/admin/support/tickets/${SAMPLE_TICKET.ticketId}/status`,
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'RESOLVED' });
    req.flush({
      success: true,
      data: { ...SAMPLE_TICKET, status: 'RESOLVED' },
      message: 'Support ticket status updated',
      error: null,
    });

    expect(result).toEqual({ ...SAMPLE_TICKET, status: 'RESOLVED' });
  });
});
