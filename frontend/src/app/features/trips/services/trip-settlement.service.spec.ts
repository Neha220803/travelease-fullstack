import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TripSettlementService } from '@app/features/trips/services/trip-settlement.service';
import {
  SettlementResponse,
  SettlementSummaryResponse,
} from '@app/features/trips/services/trip-expense.models';

const TRIP_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const SETTLEMENT_ID = 'ssssssss-0000-0000-0000-000000000001';

const SAMPLE_SETTLEMENT: SettlementResponse = {
  id: SETTLEMENT_ID,
  tripId: TRIP_ID,
  payerId: 'u2',
  payerName: 'Bob',
  receiverId: 'u1',
  receiverName: 'Alice',
  amount: 2000,
  status: 'PENDING',
};

const SAMPLE_SETTLEMENT_SUMMARY: SettlementSummaryResponse = {
  tripId: TRIP_ID,
  totalPayable: 2000,
  totalReceivable: 3000,
  settlements: [SAMPLE_SETTLEMENT],
};

describe('TripSettlementService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return {
      service: TestBed.inject(TripSettlementService),
      httpMock: TestBed.inject(HttpTestingController),
    };
  }

  it('fetches and unwraps the settlement summary', async () => {
    const { service, httpMock } = await setup();

    let result: SettlementSummaryResponse | undefined;
    service.getSettlementSummary(TRIP_ID).subscribe((summary) => (result = summary));

    const req = httpMock.expectOne(
      `http://localhost:8080/api/trips/${TRIP_ID}/settlements/summary`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: SAMPLE_SETTLEMENT_SUMMARY, message: 'Settlement summary retrieved', error: null });

    expect(result).toEqual(SAMPLE_SETTLEMENT_SUMMARY);
  });

  it('fetches and unwraps my settlements', async () => {
    const { service, httpMock } = await setup();

    let result: SettlementResponse[] | undefined;
    service.getMySettlements(TRIP_ID).subscribe((settlements) => (result = settlements));

    const req = httpMock.expectOne(
      `http://localhost:8080/api/trips/${TRIP_ID}/settlements/me`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [SAMPLE_SETTLEMENT], message: 'Settlement details retrieved', error: null });

    expect(result).toEqual([SAMPLE_SETTLEMENT]);
  });

  it('marks a settlement as paid', async () => {
    const { service, httpMock } = await setup();

    const paidSettlement: SettlementResponse = { ...SAMPLE_SETTLEMENT, status: 'PAID' };

    let result: SettlementResponse | undefined;
    service.markSettlementPaid(SETTLEMENT_ID).subscribe((settlement) => (result = settlement));

    const req = httpMock.expectOne(
      `http://localhost:8080/api/settlements/${SETTLEMENT_ID}/paid`,
    );
    expect(req.request.method).toBe('PATCH');
    req.flush({ success: true, data: paidSettlement, message: 'Settlement marked as paid', error: null });

    expect(result).toEqual(paidSettlement);
    expect(result?.status).toBe('PAID');
  });

  it('propagates an HTTP error', async () => {
    const { service, httpMock } = await setup();

    let errored = false;
    service.getMySettlements(TRIP_ID).subscribe({ error: () => (errored = true) });

    const req = httpMock.expectOne(
      `http://localhost:8080/api/trips/${TRIP_ID}/settlements/me`,
    );
    req.flush(
      { success: false, data: null, message: null, error: { code: 'SERVER_ERROR', message: 'boom' } },
      { status: 500, statusText: 'Server Error' },
    );

    expect(errored).toBe(true);
  });
});
