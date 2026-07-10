import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MyBookings } from '@app/features/bus-booking/components/my-bookings/my-bookings';
import { BookingService } from '@app/features/bus-booking/services/booking.service';

describe('MyBookings', () => {
  it('renders each booking reference and route/fare returned by the service', async () => {
    const getBookings = vi.fn(() =>
      of({
        content: [
          { id: 1, bookingReference: 'BK1', source: 'Bengaluru', destination: 'Goa', travelDate: '2026-07-12', totalFare: 1800, status: 'CONFIRMED', seatsBooked: 2 },
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        last: true,
      }),
    );
    await TestBed.configureTestingModule({
      imports: [MyBookings],
      providers: [provideRouter([]), { provide: BookingService, useValue: { getBookings } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(MyBookings);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('BK1');
    expect(text).toContain('1800');
  });
});
