import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TripExpenseService } from '@app/features/trips/services/trip-expense.service';
import {
  CreateExpenseRequest,
  ExpenseResponse,
  PagedResponse,
} from '@app/features/trips/services/trip-expense.models';

const TRIP_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const EXPENSE_ID = 'eeeeeeee-0000-0000-0000-000000000001';

const SAMPLE_EXPENSE: ExpenseResponse = {
  id: EXPENSE_ID,
  tripId: TRIP_ID,
  amount: 3000,
  category: 'Food',
  expenseDate: '2026-08-02',
  description: 'Dinner at Britto\'s',
  payerId: 'u1',
  payerName: 'Alice',
  status: 'PENDING',
  participants: [
    { userId: 'u1', name: 'Alice', shareAmount: 1000, status: 'PENDING' },
    { userId: 'u2', name: 'Bob', shareAmount: 1000, status: 'PENDING' },
    { userId: 'u3', name: 'Charlie', shareAmount: 1000, status: 'PENDING' },
  ],
  createdAt: '2026-08-02T18:30:00Z',
};

describe('TripExpenseService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return {
      service: TestBed.inject(TripExpenseService),
      httpMock: TestBed.inject(HttpTestingController),
    };
  }

  it('fetches and unwraps trip expenses', async () => {
    const { service, httpMock } = await setup();

    let result: PagedResponse<ExpenseResponse> | undefined;
    service.listTripExpenses(TRIP_ID).subscribe((expenses) => (result = expenses));

    const req = httpMock.expectOne(
      `http://localhost:8080/api/trips/${TRIP_ID}/expenses`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [SAMPLE_EXPENSE], message: 'Trip expenses retrieved', error: null });

    expect(result).toEqual([SAMPLE_EXPENSE]);
  });

  it('creates an expense and unwraps the response', async () => {
    const { service, httpMock } = await setup();

    const payload: CreateExpenseRequest = {
      amount: 3000,
      category: 'Food',
      description: 'Dinner at Britto\'s',
      expenseDate: '2026-08-02',
      payerId: 'u1',
      participantIds: ['u1', 'u2', 'u3'],
      participantShares: null,
    };

    let result: ExpenseResponse | undefined;
    service.createExpense(TRIP_ID, payload).subscribe((expense) => (result = expense));

    const req = httpMock.expectOne(
      `http://localhost:8080/api/trips/${TRIP_ID}/expenses`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true, data: SAMPLE_EXPENSE, message: 'Shared expense recorded successfully', error: null });

    expect(result).toEqual(SAMPLE_EXPENSE);
  });

  it('fetches a single expense by ID', async () => {
    const { service, httpMock } = await setup();

    let result: ExpenseResponse | undefined;
    service.getExpense(TRIP_ID, EXPENSE_ID).subscribe((expense) => (result = expense));

    const req = httpMock.expectOne(
      `http://localhost:8080/api/trips/${TRIP_ID}/expenses/${EXPENSE_ID}`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: SAMPLE_EXPENSE, message: 'Expense retrieved', error: null });

    expect(result).toEqual(SAMPLE_EXPENSE);
  });

  it('propagates an HTTP error', async () => {
    const { service, httpMock } = await setup();

    let errored = false;
    service.listTripExpenses(TRIP_ID).subscribe({ error: () => (errored = true) });

    const req = httpMock.expectOne(
      `http://localhost:8080/api/trips/${TRIP_ID}/expenses`,
    );
    req.flush(
      { success: false, data: null, message: null, error: { code: 'SERVER_ERROR', message: 'boom' } },
      { status: 500, statusText: 'Server Error' },
    );

    expect(errored).toBe(true);
  });
});
