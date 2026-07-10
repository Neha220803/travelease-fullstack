import { TestBed } from '@angular/core/testing';
import { TicketCard } from '@app/features/bus-booking/components/ticket-card/ticket-card';
import { TicketResponse } from '@app/features/bus-booking/services/booking.models';

const TICKET = {
  bookingReference: 'BK123',
  ticketNumber: 'TCK-1',
  qrCodeString: 'qr-payload',
  busName: 'Volvo',
  source: 'Bengaluru',
  destination: 'Goa',
  primaryPassengerName: 'Alice',
  totalPassengers: 2,
  totalFare: 1800,
} as TicketResponse;

describe('TicketCard', () => {
  it('renders ticket fields and no download action', async () => {
    await TestBed.configureTestingModule({ imports: [TicketCard] }).compileComponents();
    const fixture = TestBed.createComponent(TicketCard);
    fixture.componentRef.setInput('ticket', TICKET);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('TCK-1');
    expect(text).toContain('Alice');
    expect(text).not.toContain('Download');
  });
});
