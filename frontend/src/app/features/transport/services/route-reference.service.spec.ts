import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RouteReferenceService } from '@app/features/transport/services/route-reference.service';
import { RouteReferenceResponse } from '@app/features/transport/services/route-reference.models';

const ROUTE: RouteReferenceResponse = {
  id: 1,
  source: 'Bengaluru',
  destination: 'Goa',
  distanceKm: 560,
  durationHours: 10,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00',
};

describe('RouteReferenceService', () => {
  it('lists only ACTIVE admin-owned routes as read-only reference data', async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const service = TestBed.inject(RouteReferenceService);
    const httpMock = TestBed.inject(HttpTestingController);

    let result: RouteReferenceResponse[] | undefined;
    service.listActiveRoutes().subscribe((routes) => (result = routes));

    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/routes');
    expect(req.request.params.get('status')).toBe('ACTIVE');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [ROUTE], message: null, error: null });

    expect(result).toEqual([ROUTE]);
  });
});
