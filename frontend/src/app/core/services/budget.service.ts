import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '@app/core/api/api-client.service';
import { Budget, BudgetSummary } from '@app/core/models/expense.model';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly api = inject(ApiClientService);

  /** GET /api/trips/{tripId}/budget/me */
  getMyBudget(tripId: string): Observable<Budget> {
    return this.api.get<Budget>(`/api/trips/${tripId}/budget/me`);
  }

  /** GET /api/trips/{tripId}/budget/summary */
  getBudgetSummary(tripId: string): Observable<BudgetSummary> {
    return this.api.get<BudgetSummary>(`/api/trips/${tripId}/budget/summary`);
  }
}
