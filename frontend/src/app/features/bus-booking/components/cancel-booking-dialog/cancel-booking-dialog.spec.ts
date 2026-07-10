import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CancelBookingDialog } from '@app/features/bus-booking/components/cancel-booking-dialog/cancel-booking-dialog';
import { ScheduleService } from '@app/features/bus-booking/services/schedule.service';
import { BookingService } from '@app/features/bus-booking/services/booking.service';

describe('CancelBookingDialog', () => {
  it('labels the preview figure as Estimated and uses the real CancellationResponse numbers after confirming', async () => {
    const getCancellationPreview = vi.fn(() =>
      of({ scheduleId: 1, originalFare: 1000, cancellationChargePercent: 10, cancellationCharge: 100, refundPercent: 90, refundableAmount: 900 }),
    );
    const cancelBooking = vi.fn(() =>
      of({ bookingId: 5, cancellationCharge: 150, refundAmount: 850, status: 'CANCELLED' }),
    );
    await TestBed.configureTestingModule({
      imports: [CancelBookingDialog],
      providers: [
        { provide: ScheduleService, useValue: { getCancellationPreview } },
        { provide: BookingService, useValue: { cancelBooking } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CancelBookingDialog);
    fixture.componentRef.setInput('bookingId', 5);
    fixture.componentRef.setInput('scheduleId', 1);
    fixture.componentRef.setInput('totalFare', 1000);
    fixture.detectChanges();

    let text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Estimated');
    expect(text).toContain('900');

    let emitted: { refundAmount: number } | undefined;
    fixture.componentInstance.cancelled.subscribe((r) => (emitted = r as { refundAmount: number }));
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Confirm Cancellation'),
    )!;
    button.click();
    await fixture.whenStable();

    expect(emitted?.refundAmount).toBe(850);
  });
});
