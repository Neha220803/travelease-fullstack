import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ScheduleService } from '@app/features/trips/services/schedule.service';
import { BusSearchResult, TripBusBookingSummary } from '@app/features/trips/services/schedule.models';

async function setup() {
  await TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  return {
    service: TestBed.inject(ScheduleService),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('ScheduleService', () => {
  it('searches buses with source, destination and date as query params', async () => {
    const { service, httpMock } = await setup();
    const results: BusSearchResult[] = [
      {
        scheduleId: 1,
        busName: 'Volvo Multi-Axle',
        busNumber: 'KA-01-1234',
        busType: 'AC_SLEEPER',
        source: 'Bengaluru',
        destination: 'Goa',
        departureTime: '20:00:00',
        arrivalTime: '07:00:00',
        fare: 1800,
        availableSeats: 12,
        duration: 11,
        travelDate: '2026-07-12',
        amenities: ['WiFi'],
      },
    ];

    let result: BusSearchResult[] | undefined;
    service.searchBuses('Bengaluru', 'Goa', '2026-07-12').subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (r) =>
        r.url === 'http://localhost:8080/api/schedules/search' &&
        r.params.get('source') === 'Bengaluru' &&
        r.params.get('destination') === 'Goa' &&
        r.params.get('date') === '2026-07-12',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: results, message: 'ok', errors: null, status: 200, path: '/api/schedules/search' });

    expect(result).toEqual(results);
  });

  it('fetches and unwraps the trip bus booking summary', async () => {
    const { service, httpMock } = await setup();
    const summary: TripBusBookingSummary = { tripId: 't1', bookingCount: 0, totalFare: 0, bookings: [] };

    let result: TripBusBookingSummary | undefined;
    service.getTripBusBookings('t1').subscribe((r) => (result = r));

    const req = httpMock.expectOne('http://localhost:8080/api/trips/t1/bus-bookings');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: summary, message: 'ok', errors: null, status: 200, path: '/api/trips/t1/bus-bookings' });

    expect(result).toEqual(summary);
  });
});
