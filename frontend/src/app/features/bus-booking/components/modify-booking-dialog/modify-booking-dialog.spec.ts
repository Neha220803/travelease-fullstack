import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ModifyBookingDialog } from '@app/features/bus-booking/components/modify-booking-dialog/modify-booking-dialog';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { BookingModificationRequest } from '@app/features/bus-booking/services/booking.models';
import { ToastService } from '@app/shared/ui/toast/toast.service';

const SEATS = [
  { seatId: 1, seatNumber: 'A1', passengerName: 'Alice', passengerAge: 30, passengerGender: 'FEMALE', isPrimary: true },
  { seatId: 2, seatNumber: 'A2', passengerName: 'Bob', passengerAge: 28, passengerGender: 'MALE', isPrimary: false },
];

async function render(
  modifyBooking = vi.fn((_req: BookingModificationRequest) => of({ id: 5 })),
  toastOverrides: Partial<Record<'showSuccess' | 'showError', unknown>> = {},
) {
  const toast = { showSuccess: vi.fn(), showError: vi.fn(), ...toastOverrides };
  await TestBed.configureTestingModule({
    imports: [ModifyBookingDialog],
    providers: [
      { provide: BookingService, useValue: { modifyBooking } },
      { provide: ToastService, useValue: toast },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ModifyBookingDialog);
  fixture.componentRef.setInput('bookingId', 5);
  fixture.componentRef.setInput('contactEmail', 'old@example.com');
  fixture.componentRef.setInput('contactPhone', '9999999999');
  fixture.componentRef.setInput('seats', SEATS);
  fixture.detectChanges();
  return { fixture, modifyBooking, toast };
}

function getInput(fixture: ReturnType<TestBed['createComponent']>['debugElement']['nativeElement'], role: string, seatId?: number) {
  const scope = seatId
    ? (fixture as HTMLElement).querySelector(`[data-seat-id="${seatId}"]`)
    : (fixture as HTMLElement);
  return scope!.querySelector(`[data-role="${role}"]`) as HTMLInputElement | HTMLSelectElement;
}

describe('ModifyBookingDialog', () => {
  it('prepopulates contact details from the current booking', async () => {
    const { fixture } = await render();
    const el = fixture.nativeElement as HTMLElement;
    expect(getInput(el, 'contact-email').value).toBe('old@example.com');
    expect(getInput(el, 'contact-phone').value).toBe('9999999999');
  });

  it('prepopulates passenger details per seat, matched by seatId', async () => {
    const { fixture } = await render();
    const el = fixture.nativeElement as HTMLElement;

    expect(getInput(el, 'name', 1).value).toBe('Alice');
    expect(getInput(el, 'age', 1).value).toBe('30');
    expect(getInput(el, 'gender', 1).value).toBe('FEMALE');

    expect(getInput(el, 'name', 2).value).toBe('Bob');
    expect(getInput(el, 'age', 2).value).toBe('28');
    expect(getInput(el, 'gender', 2).value).toBe('MALE');
  });

  it('sends the exact BookingModificationRequest payload on submit', async () => {
    const { fixture, modifyBooking } = await render();
    const submitButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Save Changes'),
    )!;
    submitButton.click();

    expect(modifyBooking).toHaveBeenCalledWith({
      bookingId: 5,
      contactEmail: 'old@example.com',
      contactPhone: '9999999999',
      updatedPassengerDetails: [
        { seatId: 1, passengerName: 'Alice', passengerAge: 30, passengerGender: 'FEMALE' },
        { seatId: 2, passengerName: 'Bob', passengerAge: 28, passengerGender: 'MALE' },
      ],
    });
  });

  it('preserves seatId association — editing seat 2 does not leak into seat 1 payload entry', async () => {
    const { fixture, modifyBooking } = await render();
    const el = fixture.nativeElement as HTMLElement;

    const seat2Name = getInput(el, 'name', 2) as HTMLInputElement;
    seat2Name.value = 'Robert';
    seat2Name.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const submitButton = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Save Changes'))!;
    submitButton.click();

    const payload = modifyBooking.mock.calls[0][0];
    const details = payload.updatedPassengerDetails!;
    expect(details.find((p) => p.seatId === 1)!.passengerName).toBe('Alice');
    expect(details.find((p) => p.seatId === 2)!.passengerName).toBe('Robert');
  });

  it('emits the fresh BookingResponse and a success toast on successful submit', async () => {
    const freshResponse = { id: 5, bookingReference: 'BK5', status: 'CONFIRMED', totalFare: 900, contactEmail: 'new@example.com' };
    const { fixture, toast } = await render(vi.fn((_req: BookingModificationRequest) => of(freshResponse)));
    let emitted: unknown;
    fixture.componentInstance.modified.subscribe((r) => (emitted = r));

    const submitButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Save Changes'),
    )!;
    submitButton.click();

    expect(emitted).toEqual(freshResponse);
    expect(toast.showSuccess).toHaveBeenCalled();
  });

  it('surfaces a backend error via the toast convention on submit failure, without crashing', async () => {
    const modifyBooking = vi.fn((_req: BookingModificationRequest) =>
      throwError(() => ({ error: { error: { message: 'Cannot modify booking in status: CANCELLED' } } })),
    );
    const { fixture, toast } = await render(modifyBooking);

    const submitButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Save Changes'),
    )!;
    expect(() => submitButton.click()).not.toThrow();

    expect(toast.showError).toHaveBeenCalledWith('Cannot modify booking in status: CANCELLED');
  });

  it('renders no bus/schedule/seat-selection/fare/coupon/Trip-attachment fields or controls', async () => {
    const { fixture } = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Schedule');
    expect(text).not.toContain('Route');
    expect(text).not.toContain('Fare');
    expect(text).not.toContain('Coupon');
    expect(text).not.toContain('Trip');
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-role="seat-select"]')).toBeNull();
  });
});
