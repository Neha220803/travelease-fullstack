import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { TicketDisplay } from '@app/features/bus-booking/components/ticket-display/ticket-display';
import { BookingService } from '@app/features/bus-booking/services/booking.service';

describe('TicketDisplay', () => {
  it('fetches the ticket for the routed booking id and renders it', async () => {
    const getTicket = vi.fn(() => of({ ticketNumber: 'TCK-9', bookingReference: 'BK9' }));
    await TestBed.configureTestingModule({
      imports: [TicketDisplay],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '9' }) } } },
        { provide: BookingService, useValue: { getTicket } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(TicketDisplay);
    fixture.detectChanges();
    expect(getTicket).toHaveBeenCalledWith(9);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('TCK-9');
  });
});
