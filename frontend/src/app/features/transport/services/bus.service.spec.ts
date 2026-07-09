import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BusService } from '@app/features/transport/services/bus.service';
import { BusResponse } from '@app/features/transport/services/bus.models';

const BUS: BusResponse = {
  id: 1, busNumber: 'KA-01-AB-1234', busName: 'Volvo Sleeper', totalSeats: 40,
  providerId: 101, busType: 'AC_SLEEPER', amenities: ['WIFI'], status: 'ACTIVE', createdAt: '2026-01-01T00:00:00',
};

describe('BusService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return { service: TestBed.inject(BusService), httpMock: TestBed.inject(HttpTestingController) };
  }

  it('lists buses filtered by the authenticated provider (Category 1 read filter)', async () => {
    const { service, httpMock } = await setup();
    let result: BusResponse[] | undefined;
    service.listBuses(101).subscribe((buses) => (result = buses));
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/buses');
    expect(req.request.params.get('providerId')).toBe('101');
    req.flush({ success: true, data: [BUS], message: null, error: null });
    expect(result).toEqual([BUS]);
  });

  it('creates a bus with the internal providerId placeholder, never asking the caller for it', async () => {
    const { service, httpMock } = await setup();
    let result: BusResponse | undefined;
    service.createBus({
      busNumber: 'KA-02-CD-5678', busName: 'Scania AC Seater', totalSeats: 45, busType: 'AC_SEATER', amenities: [],
    }).subscribe((bus) => (result = bus));
    const req = httpMock.expectOne('http://localhost:8080/api/buses');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.providerId).toBe(0);
    req.flush({ success: true, data: BUS, message: null, error: null });
    expect(result).toEqual(BUS);
  });

  it('updates a bus at the exact PUT /api/buses/{id} path', async () => {
    const { service, httpMock } = await setup();
    let result: BusResponse | undefined;
    service.updateBus(1, {
      busNumber: 'KA-01-AB-1234', busName: 'Volvo Sleeper', totalSeats: 40, busType: 'AC_SLEEPER', amenities: ['WIFI'],
    }).subscribe((bus) => (result = bus));
    const req = httpMock.expectOne('http://localhost:8080/api/buses/1');
    expect(req.request.method).toBe('PUT');
    req.flush({ success: true, data: BUS, message: null, error: null });
    expect(result).toEqual(BUS);
  });

  it('soft-deletes a bus at the exact DELETE /api/buses/{id} path', async () => {
    const { service, httpMock } = await setup();
    let completed = false;
    service.deleteBus(1).subscribe({ complete: () => (completed = true) });
    const req = httpMock.expectOne('http://localhost:8080/api/buses/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, data: { message: 'Bus deleted successfully' }, message: null, error: null });
    expect(completed).toBe(true);
  });
});
