import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConductorService } from '@app/features/transport/services/conductor.service';
import { ConductorResponse } from '@app/features/transport/services/staff.models';

const CONDUCTOR: ConductorResponse = {
  id: 1, providerId: 101, name: 'Vikram Singh', employeeId: 'EMP-001', phone: '9000000001', email: null,
  status: 'AVAILABLE', totalTrips: 20, rating: 4.8, active: true, createdAt: '2026-01-01T00:00:00',
};

describe('ConductorService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return { service: TestBed.inject(ConductorService), httpMock: TestBed.inject(HttpTestingController) };
  }

  it('lists conductors with no providerId query param', async () => {
    const { service, httpMock } = await setup();
    let result: ConductorResponse[] | undefined;
    service.listConductors().subscribe((conductors) => (result = conductors));
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/operations/conductors');
    expect(req.request.params.has('providerId')).toBe(false);
    req.flush({ success: true, data: [CONDUCTOR], message: null, error: null });
    expect(result).toEqual([CONDUCTOR]);
  });

  it('creates a conductor without a status field and with the caller\'s own real providerId', async () => {
    const { service, httpMock } = await setup();
    let result: ConductorResponse | undefined;
    service.createConductor({ name: 'Vikram Singh', employeeId: 'EMP-001', phone: '9000000001' }, 101).subscribe((conductor) => (result = conductor));
    const req = httpMock.expectOne('http://localhost:8080/api/operations/conductors');
    expect(req.request.body.status).toBeUndefined();
    // ConductorRequest.providerId is @NotNull and is validated (not
    // discarded) server-side via resolveEffectiveProviderId, which throws
    // when a non-null value doesn't match the caller's own id. Must send
    // the real providerId, not a hardcoded placeholder.
    expect(req.request.body.providerId).toBe(101);
    req.flush({ success: true, data: CONDUCTOR, message: null, error: null });
    expect(result).toEqual(CONDUCTOR);
  });

  it('updates a conductor with name/phone/email/status but not employeeId, sending the real providerId', async () => {
    const { service, httpMock } = await setup();
    let result: ConductorResponse | undefined;
    service.updateConductor(1, { name: 'Vikram Singh', phone: '9000000001', status: 'OFF_DUTY' }, 101).subscribe((conductor) => (result = conductor));
    const req = httpMock.expectOne('http://localhost:8080/api/operations/conductors/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.employeeId).toBeUndefined();
    expect(req.request.body.providerId).toBe(101);
    req.flush({ success: true, data: { ...CONDUCTOR, status: 'OFF_DUTY' }, message: null, error: null });
    expect(result?.status).toBe('OFF_DUTY');
  });

  it('deactivates a conductor via DELETE', async () => {
    const { service, httpMock } = await setup();
    let completed = false;
    service.deactivateConductor(1).subscribe({ complete: () => (completed = true) });
    const req = httpMock.expectOne('http://localhost:8080/api/operations/conductors/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, data: { message: 'ok' }, message: null, error: null });
    expect(completed).toBe(true);
  });
});
