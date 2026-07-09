import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TripService } from '@app/features/transport/services/trip.service';
import { TripResponse } from '@app/features/transport/services/trip.models';

const TRIP: TripResponse = {
  id: 1, scheduleId: 1, routeId: 1, providerId: 101, busId: 1, busNumber: 'KA-01-AB-1234', busName: 'Volvo',
  driverId: null, driverName: null, driverLicense: null, conductorId: null, conductorName: null,
  status: 'SCHEDULED', actualDepartureTime: null, actualArrivalTime: null, delayMinutes: 0, distanceCoveredKm: 0,
  notes: null, createdAt: '2026-07-01T00:00:00', updatedAt: '2026-07-01T00:00:00',
};

describe('TripService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return { service: TestBed.inject(TripService), httpMock: TestBed.inject(HttpTestingController) };
  }

  it('lists trips with no client-side provider filter (already backend-scoped)', async () => {
    const { service, httpMock } = await setup();

    let result: TripResponse[] | undefined;
    service.listTrips().subscribe((trips) => (result = trips));

    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/operations/trips');
    expect(req.request.params.has('providerId')).toBe(false);
    req.flush({ success: true, data: [TRIP], message: null, error: null });

    expect(result).toEqual([TRIP]);
  });

  it('assigns crew with driver/conductor left optional', async () => {
    const { service, httpMock } = await setup();

    let result: TripResponse | undefined;
    service.assignTrip({ scheduleId: 1 }).subscribe((trip) => (result = trip));

    const req = httpMock.expectOne('http://localhost:8080/api/operations/trips/assign');
    expect(req.request.body).toEqual({ scheduleId: 1 });
    req.flush({ success: true, data: TRIP, message: null, error: null });

    expect(result).toEqual(TRIP);
  });

  it('transitions trip status via the exact PATCH path', async () => {
    const { service, httpMock } = await setup();

    let result: TripResponse | undefined;
    service.transitionStatus(1, { status: 'BOARDING' }).subscribe((trip) => (result = trip));

    const req = httpMock.expectOne('http://localhost:8080/api/operations/trips/1/status');
    expect(req.request.method).toBe('PATCH');
    req.flush({ success: true, data: { ...TRIP, status: 'BOARDING' }, message: null, error: null });

    expect(result?.status).toBe('BOARDING');
  });

  it('fetches fleet availability with providerId as a required path segment', async () => {
    const { service, httpMock } = await setup();

    let result: { totalBuses?: number } | undefined;
    service.getFleetAvailability(101).subscribe((availability) => (result = availability));

    const req = httpMock.expectOne('http://localhost:8080/api/operations/fleet/availability/101');
    req.flush({
      success: true,
      data: { providerId: 101, totalBuses: 8, activeBuses: 6, maintenanceBuses: 2, inactiveBuses: 0, availableDrivers: 4, availableConductors: 4, activeTrips: 2, scheduledTrips: 3 },
      message: null, error: null,
    });

    expect(result?.totalBuses).toBe(8);
  });
});
