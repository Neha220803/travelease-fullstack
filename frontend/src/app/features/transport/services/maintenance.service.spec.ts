import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MaintenanceService } from '@app/features/transport/services/maintenance.service';
import { MaintenanceResponse } from '@app/features/transport/services/maintenance.models';

const RECORD: MaintenanceResponse = {
  id: 1,
  busId: 1,
  busNumber: 'KA-01-AB-1234',
  maintenanceType: 'OIL_CHANGE',
  description: 'Routine oil change',
  status: 'SCHEDULED',
  scheduledDate: '2026-08-01',
  completedDate: null,
  cost: 0,
  nextMaintenanceDate: null,
  performedBy: null,
  createdAt: '2026-07-01T00:00:00',
};

describe('MaintenanceService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return { service: TestBed.inject(MaintenanceService), httpMock: TestBed.inject(HttpTestingController) };
  }

  it('lists maintenance records with no providerId param at all', async () => {
    const { service, httpMock } = await setup();

    let result: MaintenanceResponse[] | undefined;
    service.listMaintenance().subscribe((records) => (result = records));

    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/operations/maintenance');
    expect(req.request.params.has('providerId')).toBe(false);
    req.flush({ success: true, data: [RECORD], message: null, error: null });

    expect(result).toEqual([RECORD]);
  });

  it('schedules maintenance with only busId, no providerId field', async () => {
    const { service, httpMock } = await setup();

    let result: MaintenanceResponse | undefined;
    service
      .scheduleMaintenance({
        busId: 1,
        maintenanceType: 'OIL_CHANGE',
        description: 'Routine',
        scheduledDate: '2026-08-01',
      })
      .subscribe((record) => (result = record));

    const req = httpMock.expectOne('http://localhost:8080/api/operations/maintenance');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.providerId).toBeUndefined();
    req.flush({ success: true, data: RECORD, message: null, error: null });

    expect(result).toEqual(RECORD);
  });

  it('transitions status via the exact PATCH path', async () => {
    const { service, httpMock } = await setup();

    let result: MaintenanceResponse | undefined;
    service.transitionStatus(1, { status: 'IN_PROGRESS' }).subscribe((record) => (result = record));

    const req = httpMock.expectOne('http://localhost:8080/api/operations/maintenance/1/status');
    expect(req.request.method).toBe('PATCH');
    req.flush({ success: true, data: { ...RECORD, status: 'IN_PROGRESS' }, message: null, error: null });

    expect(result?.status).toBe('IN_PROGRESS');
  });
});
