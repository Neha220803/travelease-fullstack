import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PartialCancelDialog } from '@app/features/bus-booking/components/partial-cancel-dialog/partial-cancel-dialog';
import { BookingService } from '@app/features/bus-booking/services/booking.service';

const SEATS = [
  { seatId: 1, seatNumber: 'A1', passengerName: 'Alice', passengerAge: 30, passengerGender: 'FEMALE', isPrimary: true },
  { seatId: 2, seatNumber: 'A2', passengerName: 'Bob', passengerAge: 28, passengerGender: 'MALE', isPrimary: false },
];

describe('PartialCancelDialog', () => {
  it('disables confirmation and shows the exact block message when every seat is selected', async () => {
    await TestBed.configureTestingModule({
      imports: [PartialCancelDialog],
      providers: [{ provide: BookingService, useValue: { partialCancelBooking: vi.fn() } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(PartialCancelDialog);
    fixture.componentRef.setInput('bookingId', 5);
    fixture.componentRef.setInput('seats', SEATS);
    fixture.detectChanges();

    const checkboxes = (fixture.nativeElement as HTMLElement).querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    checkboxes[0].click();
    checkboxes[1].click();
    fixture.detectChanges();

    const confirmButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Confirm Partial Cancellation'),
    )!;
    expect(confirmButton.disabled).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('To cancel all seats, use Cancel Booking.');
  });

  it('calls partialCancelBooking with only the selected seat ids when fewer than all seats are selected', async () => {
    const partialCancelBooking = vi.fn(() => of({ bookingId: 5, status: 'CONFIRMED' }));
    await TestBed.configureTestingModule({
      imports: [PartialCancelDialog],
      providers: [{ provide: BookingService, useValue: { partialCancelBooking } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(PartialCancelDialog);
    fixture.componentRef.setInput('bookingId', 5);
    fixture.componentRef.setInput('seats', SEATS);
    fixture.detectChanges();

    const checkboxes = (fixture.nativeElement as HTMLElement).querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    checkboxes[0].click();
    fixture.detectChanges();

    const confirmButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Confirm Partial Cancellation'),
    )!;
    expect(confirmButton.disabled).toBe(false);
    confirmButton.click();

    expect(partialCancelBooking).toHaveBeenCalledWith({ bookingId: 5, seatIds: [1], reason: 'OTHER' });
  });
});
