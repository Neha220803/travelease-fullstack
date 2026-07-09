import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  BudgetResponse,
  BudgetSummaryResponse,
} from '@app/features/trips/services/trip-expense.models';

@Injectable({ providedIn: 'root' })
export class TripBudgetService {
  private readonly http = inject(HttpClient);

  getBudgetSummary(tripId: string): Observable<BudgetSummaryResponse> {
    return this.http
      .get<ApiResponse<BudgetSummaryResponse>>(
        `${API_BASE_URL}/api/trips/${tripId}/budget/summary`,
      )
      .pipe(map((response) => response.data));
  }

  getMyBudget(tripId: string): Observable<BudgetResponse> {
    return this.http
      .get<ApiResponse<BudgetResponse>>(`${API_BASE_URL}/api/trips/${tripId}/budget/me`)
      .pipe(map((response) => response.data));
  }
}
