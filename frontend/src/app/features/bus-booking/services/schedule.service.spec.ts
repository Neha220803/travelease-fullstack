import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ScheduleService } from '@app/features/bus-booking/services/schedule.service';
import { API_BASE_URL } from '@app/core/api/api-config';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ScheduleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('locks seats via POST /api/seats/lock', () => {
    service.lockSeats({ scheduleId: 5, seatIds: [1, 2] }).subscribe((res) => {
      expect(res.lockedSeatIds).toEqual([1, 2]);
    });
    const req = httpMock.expectOne(`${API_BASE_URL}/api/seats/lock`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ scheduleId: 5, seatIds: [1, 2] });
    req.flush({
      data: { scheduleId: 5, lockedSeatIds: [1, 2], lockedAt: '2026-07-09T10:00:00', expiresAt: '2026-07-09T10:05:00', message: 'ok' },
    });
  });

  it('surfaces a 409 SEAT_UNAVAILABLE conflict without transforming it', () => {
    let caught: unknown;
    service.lockSeats({ scheduleId: 5, seatIds: [3] }).subscribe({
      error: (err) => (caught = err),
    });
    const req = httpMock.expectOne(`${API_BASE_URL}/api/seats/lock`);
    req.flush(
      { success: false, error: { code: 'SEAT_UNAVAILABLE', message: 'Seat with ID 3 is currently locked by another user' } },
      { status: 409, statusText: 'Conflict' },
    );
    expect((caught as { status: number }).status).toBe(409);
  });

  it('calculates fare via POST /api/fares/calculate', () => {
    service.calculateFare({ scheduleId: 5, seatIds: [1] }).subscribe((res) => {
      expect(res.totalPayable).toBe(500);
    });
    const req = httpMock.expectOne(`${API_BASE_URL}/api/fares/calculate`);
    expect(req.request.method).toBe('POST');
    req.flush({ data: { breakdown: {}, totalPayable: 500, totalSavings: 0 } });
  });
});
