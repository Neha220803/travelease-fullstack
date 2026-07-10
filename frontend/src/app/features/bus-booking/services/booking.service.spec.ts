import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { API_BASE_URL } from '@app/core/api/api-config';

describe('BookingService', () => {
  let service: BookingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(BookingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates a booking via POST /api/bookings', () => {
    service.createBooking({ scheduleId: 1, seatIds: [1], passengerDetails: [] }).subscribe((res) => {
      expect(res.id).toBe(42);
    });
    const req = httpMock.expectOne(`${API_BASE_URL}/api/bookings`);
    expect(req.request.method).toBe('POST');
    req.flush({ data: { id: 42, status: 'CONFIRMED' } });
  });

  it('lists bookings with scope/status/reference/date filters', () => {
    service.getBookings({ scope: 'UPCOMING', status: 'CONFIRMED' }).subscribe((res) => {
      expect(res.content).toEqual([]);
    });
    const req = httpMock.expectOne(
      (r) => r.url === `${API_BASE_URL}/api/bookings` && r.params.get('scope') === 'UPCOMING' && r.params.get('status') === 'CONFIRMED',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ data: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true } });
  });

  it('cancels a booking via POST /api/bookings/{id}/cancel with an optional reason body', () => {
    service.cancelBooking(42, { bookingId: 42, reason: 'CHANGE_OF_PLANS' }).subscribe((res) => {
      expect(res.status).toBe('CANCELLED');
    });
    const req = httpMock.expectOne(`${API_BASE_URL}/api/bookings/42/cancel`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ bookingId: 42, reason: 'CHANGE_OF_PLANS' });
    req.flush({ data: { bookingId: 42, status: 'CANCELLED' } });
  });

  it('detaches a booking from a trip via DELETE /api/trips/{tripId}/bus-bookings/{bookingId}', () => {
    service.removeBookingFromTrip('trip-1', 42).subscribe();
    const req = httpMock.expectOne(`${API_BASE_URL}/api/trips/trip-1/bus-bookings/42`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ data: null });
  });
});
