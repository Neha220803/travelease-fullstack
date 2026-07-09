import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AccommodationService } from '@app/features/trips/services/accommodation.service';
import { AccommodationSummary } from '@app/features/trips/services/accommodation.models';

async function setup() {
  await TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  return {
    service: TestBed.inject(AccommodationService),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('AccommodationService', () => {
  it('fetches and unwraps the trip accommodation summary', async () => {
    const { service, httpMock } = await setup();
    const summary: AccommodationSummary = { tripId: 't1', bookingCount: 0, totalAmount: 0, bookings: [] };

    let result: AccommodationSummary | undefined;
    service.getAccommodationSummary('t1').subscribe((r) => (result = r));

    const req = httpMock.expectOne('http://localhost:8080/api/trips/t1/accommodation-summary');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: summary, message: 'ok', error: null });

    expect(result).toEqual(summary);
  });

  it('propagates an HTTP error', async () => {
    const { service, httpMock } = await setup();

    let errored = false;
    service.getAccommodationSummary('t1').subscribe({ error: () => (errored = true) });

    const req = httpMock.expectOne('http://localhost:8080/api/trips/t1/accommodation-summary');
    req.flush(
      { success: false, data: null, message: null, error: { code: 'SERVER_ERROR', message: 'boom' } },
      { status: 500, statusText: 'Server Error' },
    );

    expect(errored).toBe(true);
  });
});
