import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DriverService } from '@app/features/transport/services/driver.service';
import { DriverResponse } from '@app/features/transport/services/staff.models';

const DRIVER: DriverResponse = {
  id: 1, providerId: 101, name: 'Ravi Kumar', licenseNumber: 'KA-DL-001', phone: '9000000002', email: null,
  status: 'AVAILABLE', totalTrips: 12, totalDistanceKm: 4300, rating: 4.6, active: true, createdAt: '2026-01-01T00:00:00',
};

describe('DriverService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return { service: TestBed.inject(DriverService), httpMock: TestBed.inject(HttpTestingController) };
  }

  it('lists drivers with no providerId query param', async () => {
    const { service, httpMock } = await setup();
    let result: DriverResponse[] | undefined;
    service.listDrivers().subscribe((drivers) => (result = drivers));
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/operations/drivers');
    expect(req.request.params.has('providerId')).toBe(false);
    req.flush({ success: true, data: [DRIVER], message: null, error: null });
    expect(result).toEqual([DRIVER]);
  });

  it('creates a driver without a status field and with the providerId placeholder', async () => {
    const { service, httpMock } = await setup();
    let result: DriverResponse | undefined;
    service.createDriver({ name: 'Ravi Kumar', licenseNumber: 'KA-DL-001', phone: '9000000002' }).subscribe((driver) => (result = driver));
    const req = httpMock.expectOne('http://localhost:8080/api/operations/drivers');
    expect(req.request.body.status).toBeUndefined();
    expect(req.request.body.providerId).toBe(0);
    req.flush({ success: true, data: DRIVER, message: null, error: null });
    expect(result).toEqual(DRIVER);
  });

  it('updates a driver with name/phone/email/status but not licenseNumber', async () => {
    const { service, httpMock } = await setup();
    let result: DriverResponse | undefined;
    service.updateDriver(1, { name: 'Ravi Kumar', phone: '9000000002', status: 'OFF_DUTY' }).subscribe((driver) => (result = driver));
    const req = httpMock.expectOne('http://localhost:8080/api/operations/drivers/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.licenseNumber).toBeUndefined();
    req.flush({ success: true, data: { ...DRIVER, status: 'OFF_DUTY' }, message: null, error: null });
    expect(result?.status).toBe('OFF_DUTY');
  });

  it('deactivates a driver via DELETE', async () => {
    const { service, httpMock } = await setup();
    let completed = false;
    service.deactivateDriver(1).subscribe({ complete: () => (completed = true) });
    const req = httpMock.expectOne('http://localhost:8080/api/operations/drivers/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, data: { message: 'ok' }, message: null, error: null });
    expect(completed).toBe(true);
  });
});
