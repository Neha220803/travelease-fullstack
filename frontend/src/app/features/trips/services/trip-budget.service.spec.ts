import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TripBudgetService } from '@app/features/trips/services/trip-budget.service';
import {
  BudgetResponse,
  BudgetSummaryResponse,
} from '@app/features/trips/services/trip-expense.models';

const TRIP_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

const SAMPLE_MY_BUDGET: BudgetResponse = {
  tripId: TRIP_ID,
  userId: 'u1',
  budgetAmount: 15000,
  spentAmount: 3000,
  remainingAmount: 12000,
  utilizationPercentage: 20,
  overspent: false,
};

const SAMPLE_BUDGET_SUMMARY: BudgetSummaryResponse = {
  tripId: TRIP_ID,
  totalBudget: 45000,
  totalSpent: 9000,
  remainingBudget: 36000,
  utilizationPercentage: 20,
  overspent: false,
  members: [
    {
      userId: 'u1',
      name: 'Alice',
      budgetAmount: 15000,
      spentAmount: 3000,
      remainingAmount: 12000,
      utilizationPercentage: 20,
      overspent: false,
    },
    {
      userId: 'u2',
      name: 'Bob',
      budgetAmount: 15000,
      spentAmount: 3000,
      remainingAmount: 12000,
      utilizationPercentage: 20,
      overspent: false,
    },
    {
      userId: 'u3',
      name: 'Charlie',
      budgetAmount: 15000,
      spentAmount: 3000,
      remainingAmount: 12000,
      utilizationPercentage: 20,
      overspent: false,
    },
  ],
};

describe('TripBudgetService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return {
      service: TestBed.inject(TripBudgetService),
      httpMock: TestBed.inject(HttpTestingController),
    };
  }

  it('fetches and unwraps the budget summary', async () => {
    const { service, httpMock } = await setup();

    let result: BudgetSummaryResponse | undefined;
    service.getBudgetSummary(TRIP_ID).subscribe((summary) => (result = summary));

    const req = httpMock.expectOne(
      `http://localhost:8080/api/trips/${TRIP_ID}/budget/summary`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: SAMPLE_BUDGET_SUMMARY, message: 'Trip budget summary retrieved', error: null });

    expect(result).toEqual(SAMPLE_BUDGET_SUMMARY);
  });

  it('fetches and unwraps my budget', async () => {
    const { service, httpMock } = await setup();

    let result: BudgetResponse | undefined;
    service.getMyBudget(TRIP_ID).subscribe((budget) => (result = budget));

    const req = httpMock.expectOne(
      `http://localhost:8080/api/trips/${TRIP_ID}/budget/me`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: SAMPLE_MY_BUDGET, message: 'Budget usage retrieved', error: null });

    expect(result).toEqual(SAMPLE_MY_BUDGET);
  });

  it('propagates an HTTP error', async () => {
    const { service, httpMock } = await setup();

    let errored = false;
    service.getBudgetSummary(TRIP_ID).subscribe({ error: () => (errored = true) });

    const req = httpMock.expectOne(
      `http://localhost:8080/api/trips/${TRIP_ID}/budget/summary`,
    );
    req.flush(
      { success: false, data: null, message: null, error: { code: 'SERVER_ERROR', message: 'boom' } },
      { status: 500, statusText: 'Server Error' },
    );

    expect(errored).toBe(true);
  });
});
