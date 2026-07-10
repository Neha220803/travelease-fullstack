import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TicketVerification } from '@app/features/bus-booking/components/ticket-verification/ticket-verification';
import { BookingService } from '@app/features/bus-booking/services/booking.service';

describe('TicketVerification', () => {
  it('looks up a ticket by number and shows it on success', async () => {
    const verifyTicket = vi.fn(() => of({ ticketNumber: 'TCK-7', bookingReference: 'BK7' }));
    await TestBed.configureTestingModule({
      imports: [TicketVerification],
      providers: [{ provide: BookingService, useValue: { verifyTicket } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(TicketVerification);
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    input.value = 'TCK-7';
    input.dispatchEvent(new Event('input'));
    const button = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(verifyTicket).toHaveBeenCalledWith('TCK-7');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('TCK-7');
  });

  it('shows an error message when the ticket number is not found', async () => {
    const verifyTicket = vi.fn(() => throwError(() => ({ status: 404 })));
    await TestBed.configureTestingModule({
      imports: [TicketVerification],
      providers: [{ provide: BookingService, useValue: { verifyTicket } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(TicketVerification);
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    input.value = 'BAD';
    input.dispatchEvent(new Event('input'));
    const button = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('not found');
  });
});
