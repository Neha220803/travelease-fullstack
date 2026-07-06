import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  CreateExpenseRequest,
  ExpenseResponse,
} from '@app/features/trips/services/trip-expense.models';

@Injectable({ providedIn: 'root' })
export class TripExpenseService {
  private readonly http = inject(HttpClient);

  listTripExpenses(tripId: string): Observable<ExpenseResponse[]> {
    return this.http
      .get<ApiResponse<ExpenseResponse[]>>(`${API_BASE_URL}/api/trips/${tripId}/expenses`)
      .pipe(map((response) => response.data));
  }

  createExpense(tripId: string, request: CreateExpenseRequest): Observable<ExpenseResponse> {
    return this.http
      .post<ApiResponse<ExpenseResponse>>(`${API_BASE_URL}/api/trips/${tripId}/expenses`, request)
      .pipe(map((response) => response.data));
  }

  getExpense(tripId: string, expenseId: string): Observable<ExpenseResponse> {
    return this.http
      .get<ApiResponse<ExpenseResponse>>(
        `${API_BASE_URL}/api/trips/${tripId}/expenses/${expenseId}`,
      )
      .pipe(map((response) => response.data));
  }
}
