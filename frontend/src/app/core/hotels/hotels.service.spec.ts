import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HotelsService } from '@app/core/hotels/hotels.service';
import { Hotel } from '@app/core/hotels/hotel.models';

async function setup() {
  await TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  return {
    service: TestBed.inject(HotelsService),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('HotelsService', () => {
  it('fetches and unwraps hotels for a destination', async () => {
    const { service, httpMock } = await setup();
    const hotels: Hotel[] = [
      {
        hotelId: 'h1',
        destinationId: 2,
        hotelName: 'Sea Breeze Resort',
        address: 'Baga Beach, Goa',
        rating: 4.7,
        pricePerNight: 4800,
        amenities: 'WiFi, Pool',
        status: 'ACTIVE',
        policies: 'No pets',
      },
    ];

    let result: Hotel[] | undefined;
    service.searchHotels(2).subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (r) => r.url === 'http://localhost:8080/api/hotels' && r.params.get('destinationId') === '2',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: hotels, message: 'ok', error: null });

    expect(result).toEqual(hotels);
  });

  it('includes the free-text query param when provided', async () => {
    const { service, httpMock } = await setup();

    service.searchHotels(2, 'sea').subscribe();

    const req = httpMock.expectOne(
      (r) =>
        r.url === 'http://localhost:8080/api/hotels' &&
        r.params.get('destinationId') === '2' &&
        r.params.get('q') === 'sea',
    );
    req.flush({ success: true, data: [], message: 'ok', error: null });
  });

  it('propagates an HTTP error', async () => {
    const { service, httpMock } = await setup();

    let errored = false;
    service.searchHotels(2).subscribe({ error: () => (errored = true) });

    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/hotels');
    req.flush(
      { success: false, data: null, message: null, error: { code: 'SERVER_ERROR', message: 'boom' } },
      { status: 500, statusText: 'Server Error' },
    );

    expect(errored).toBe(true);
  });
});
