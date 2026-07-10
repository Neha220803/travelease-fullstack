import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { BookingDetail } from '@app/features/bus-booking/components/booking-detail/booking-detail';
import { BookingService } from '@app/features/bus-booking/services/booking.service';

describe('BookingDetail', () => {
  it('renders the booking reference, status, and timeline, with no Trip-attachment UI', async () => {
    await TestBed.configureTestingModule({
      imports: [BookingDetail],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
        {
          provide: BookingService,
          useValue: {
            getBookingById: () => of({ id: 5, bookingReference: 'BK5', status: 'CONFIRMED', totalFare: 900 }),
            getBookingTimeline: () => of([{ event: 'BOOKING_CREATED', description: 'created', occurredAt: '2026-07-09T10:00:00' }]),
            // Added by Task 20: the plan's Task 17 test fixture predates the
            // refund fetch that Task 20 adds unconditionally to the
            // constructor. Without this, the component throws
            // "getRefundsByBooking is not a function" the moment it's
            // constructed. Returning an empty list keeps this test's original
            // assertions (no Trip-attachment UI) intact and unaffected.
            getRefundsByBooking: () => of([]),
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(BookingDetail);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('BK5');
    expect(text).toContain('created');
    expect(text).not.toContain('Attached to');
    expect(text).not.toContain('Detach');
  });

  it('shows refund details after a cancellation, fetched by bookingId only', async () => {
    const getRefundsByBooking = vi.fn(() => of([{ id: 1, refundReference: 'RF1', netRefundable: 850, status: 'COMPLETED' }]));
    await TestBed.configureTestingModule({
      imports: [BookingDetail],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
        {
          provide: BookingService,
          useValue: {
            getBookingById: () => of({ id: 5, bookingReference: 'BK5', status: 'CANCELLED', totalFare: 900, seats: [] }),
            getBookingTimeline: () => of([]),
            getRefundsByBooking,
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(BookingDetail);
    fixture.detectChanges();
    expect(getRefundsByBooking).toHaveBeenCalledWith(5);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('RF1');
  });

  it('opens the modify dialog on Modify click, and a successful modification updates the displayed booking and refreshes the timeline', async () => {
    const initialBooking = {
      id: 5,
      bookingReference: 'BK5',
      status: 'CONFIRMED',
      totalFare: 900,
      contactEmail: 'old@example.com',
      contactPhone: '9999999999',
      seats: [{ seatId: 1, seatNumber: 'A1', passengerName: 'Alice', passengerAge: 30, passengerGender: 'FEMALE', isPrimary: true }],
    };
    const freshBooking = { ...initialBooking, totalFare: 950, contactEmail: 'new@example.com' };
    const getBookingTimeline = vi
      .fn()
      .mockReturnValueOnce(of([{ event: 'BOOKING_CREATED', description: 'created', occurredAt: '2026-07-09T10:00:00' }]))
      .mockReturnValueOnce(of([{ event: 'BOOKING_MODIFIED', description: 'modified', occurredAt: '2026-07-10T10:00:00' }]));
    const modifyBooking = vi.fn(() => of(freshBooking));

    await TestBed.configureTestingModule({
      imports: [BookingDetail],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
        {
          provide: BookingService,
          useValue: {
            getBookingById: () => of(initialBooking),
            getBookingTimeline,
            getRefundsByBooking: () => of([]),
            modifyBooking,
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(BookingDetail);
    fixture.detectChanges();

    const modifyButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.trim() === 'Modify',
    )!;
    expect(modifyButton).toBeTruthy();
    modifyButton.click();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Modify Booking');

    const saveButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Save Changes'),
    )!;
    saveButton.click();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('₹950');
    expect(getBookingTimeline).toHaveBeenCalledTimes(2);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('modified');
  });

  it.each(['CANCELLED', 'COMPLETED', 'EXPIRED', 'FAILED'])('hides the Modify action for terminal status %s', async (status) => {
    await TestBed.configureTestingModule({
      imports: [BookingDetail],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
        {
          provide: BookingService,
          useValue: {
            getBookingById: () => of({ id: 5, bookingReference: 'BK5', status, totalFare: 900, seats: [] }),
            getBookingTimeline: () => of([]),
            getRefundsByBooking: () => of([]),
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(BookingDetail);
    fixture.detectChanges();

    const modifyButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.trim() === 'Modify',
    );
    expect(modifyButton).toBeUndefined();
  });
});
