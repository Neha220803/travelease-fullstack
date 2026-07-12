import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StaffService } from '@app/features/transport/services/staff.service';
import { StaffResponse } from '@app/features/transport/services/staff.models';

const DRIVER: StaffResponse = {
  id: 1, providerId: 101, name: 'Ravi Kumar', staffType: 'DRIVER', licenseNumber: 'KA-DL-001', employeeId: null,
  phone: '9000000002', email: null, status: 'AVAILABLE', totalTrips: 12, totalDistanceKm: 4300, rating: 4.6,
  active: true, createdAt: '2026-01-01T00:00:00',
};

describe('StaffService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return { service: TestBed.inject(StaffService), httpMock: TestBed.inject(HttpTestingController) };
  }

  it('lists staff with no staffType query param when none is given', async () => {
    const { service, httpMock } = await setup();
    let result: StaffResponse[] | undefined;
    service.listStaff().subscribe((staff) => (result = staff));
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/operations/staff');
    expect(req.request.params.has('staffType')).toBe(false);
    req.flush({ success: true, data: [DRIVER], message: null, error: null });
    expect(result).toEqual([DRIVER]);
  });

  it('lists staff filtered by staffType', async () => {
    const { service, httpMock } = await setup();
    service.listStaff('DRIVER').subscribe();
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/operations/staff');
    expect(req.request.params.get('staffType')).toBe('DRIVER');
    req.flush({ success: true, data: [DRIVER], message: null, error: null });
  });

  it('creates staff without a status field and with the caller\'s own real providerId', async () => {
    const { service, httpMock } = await setup();
    let result: StaffResponse | undefined;
    service.createStaff({ name: 'Ravi Kumar', staffType: 'DRIVER', licenseNumber: 'KA-DL-001' }, 101).subscribe((staff) => (result = staff));
    const req = httpMock.expectOne('http://localhost:8080/api/operations/staff');
    expect(req.request.body.status).toBeUndefined();
    // StaffRequest.providerId is @NotNull and is validated (not discarded)
    // server-side via resolveEffectiveProviderId, which throws when a
    // non-null value doesn't match the caller's own id. Must send the
    // real providerId, not a hardcoded placeholder.
    expect(req.request.body.providerId).toBe(101);
    req.flush({ success: true, data: DRIVER, message: null, error: null });
    expect(result).toEqual(DRIVER);
  });

  it('updates staff with name/phone/email/status but not staffType, sending the real providerId', async () => {
    const { service, httpMock } = await setup();
    let result: StaffResponse | undefined;
    service.updateStaff(1, { name: 'Ravi Kumar', status: 'OFF_DUTY' }, 101).subscribe((staff) => (result = staff));
    const req = httpMock.expectOne('http://localhost:8080/api/operations/staff/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.staffType).toBeUndefined();
    expect(req.request.body.providerId).toBe(101);
    req.flush({ success: true, data: { ...DRIVER, status: 'OFF_DUTY' }, message: null, error: null });
    expect(result?.status).toBe('OFF_DUTY');
  });

  it('deactivates staff via DELETE', async () => {
    const { service, httpMock } = await setup();
    let completed = false;
    service.deactivateStaff(1).subscribe({ complete: () => (completed = true) });
    const req = httpMock.expectOne('http://localhost:8080/api/operations/staff/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, data: { message: 'ok' }, message: null, error: null });
    expect(completed).toBe(true);
  });
});
