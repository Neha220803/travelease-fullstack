import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { BookingConfirmation } from '@app/features/bus-booking/components/booking-confirmation/booking-confirmation';
import { BookingService } from '@app/features/bus-booking/services/booking.service';

async function render(tripId: string | null) {
  await TestBed.configureTestingModule({
    imports: [BookingConfirmation],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: convertToParamMap({ id: '42' }) },
          queryParamMap: of(convertToParamMap(tripId ? { tripId } : {})),
        },
      },
      {
        provide: BookingService,
        useValue: {
          getBookingById: () => of({ id: 42, bookingReference: 'BK1', status: 'CONFIRMED', totalFare: 500 }),
          attachBookingToTrip: vi.fn(() => of({})),
        },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(BookingConfirmation);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('BookingConfirmation', () => {
  it('shows Attach to this Trip and Back to Trip when tripId query param is present', async () => {
    const fixture = await render('trip-1');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Attach to this Trip');
    expect(text).toContain('Back to Trip');
  });

  it('shows neither action when tripId query param is absent (standalone booking)', async () => {
    const fixture = await render(null);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Attach to this Trip');
    expect(text).not.toContain('Back to Trip');
  });
});
