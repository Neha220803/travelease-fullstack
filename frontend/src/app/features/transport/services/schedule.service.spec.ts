import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ScheduleService } from '@app/features/transport/services/schedule.service';
import { ScheduleResponse } from '@app/features/transport/services/schedule.models';
import { BusResponse } from '@app/features/transport/services/bus.models';
import { RouteReferenceResponse } from '@app/features/transport/services/route-reference.models';

const BUS: BusResponse = {
  id: 1,
  busNumber: 'KA-01-AB-1234',
  busName: 'Volvo',
  totalSeats: 40,
  providerId: 101,
  busType: 'AC_SLEEPER',
  amenities: [],
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00',
};
const OTHER_PROVIDER_BUS: BusResponse = { ...BUS, id: 2, providerId: 202 };
const ROUTE: RouteReferenceResponse = {
  id: 1,
  source: 'Bengaluru',
  destination: 'Goa',
  distanceKm: 560,
  durationHours: 10,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00',
};
const SCHEDULE_MINE: ScheduleResponse = {
  id: 1,
  bus: BUS,
  route: ROUTE,
  travelDate: '2026-08-01',
  departureTime: '20:00',
  arrivalTime: '06:00',
  fare: 1200,
  availableSeats: 40,
  status: 'SCHEDULED',
};
const SCHEDULE_OTHER: ScheduleResponse = { ...SCHEDULE_MINE, id: 2, bus: OTHER_PROVIDER_BUS };

describe('ScheduleService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return { service: TestBed.inject(ScheduleService), httpMock: TestBed.inject(HttpTestingController) };
  }

  it('fetches all schedules (no server-side scoping exists) and filters client-side by providerId', async () => {
    const { service, httpMock } = await setup();

    let result: ScheduleResponse[] | undefined;
    service.listMySchedules(101).subscribe((schedules) => (result = schedules));

    const req = httpMock.expectOne('http://localhost:8080/api/schedules');
    expect(req.request.params.keys().length).toBe(0);
    req.flush({ success: true, data: [SCHEDULE_MINE, SCHEDULE_OTHER], message: null, error: null });

    expect(result).toEqual([SCHEDULE_MINE]);
  });

  it('creates a schedule with only busId/routeId/travelDate/departureTime/arrivalTime/fare', async () => {
    const { service, httpMock } = await setup();

    let result: ScheduleResponse | undefined;
    service.createSchedule({
      busId: 1,
      routeId: 1,
      travelDate: '2026-08-01',
      departureTime: '20:00',
      arrivalTime: '06:00',
      fare: 1200,
    }).subscribe((schedule) => (result = schedule));

    const req = httpMock.expectOne('http://localhost:8080/api/schedules');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.providerId).toBeUndefined();
    req.flush({ success: true, data: SCHEDULE_MINE, message: null, error: null });

    expect(result).toEqual(SCHEDULE_MINE);
  });

  it('cancels a schedule via DELETE (the only lifecycle action available)', async () => {
    const { service, httpMock } = await setup();

    let completed = false;
    service.cancelSchedule(1).subscribe(() => (completed = true));

    const req = httpMock.expectOne('http://localhost:8080/api/schedules/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, data: { message: 'Schedule cancelled successfully' }, message: null, error: null });

    expect(completed).toBe(true);
  });
});
