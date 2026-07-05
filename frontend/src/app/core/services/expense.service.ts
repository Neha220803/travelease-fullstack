import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '@app/core/api/api-client.service';
import { Expense, CreateExpenseRequest } from '@app/core/models/expense.model';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly api = inject(ApiClientService);

  /** POST /api/trips/{tripId}/expenses */
  createExpense(tripId: string, request: CreateExpenseRequest): Observable<Expense> {
    return this.api.post<Expense>(`/api/trips/${tripId}/expenses`, request);
  }

  /** GET /api/trips/{tripId}/expenses */
  getExpenses(tripId: string): Observable<Expense[]> {
    return this.api.get<Expense[]>(`/api/trips/${tripId}/expenses`);
  }

  /** GET /api/trips/{tripId}/expenses/{expenseId} */
  getExpense(tripId: string, expenseId: string): Observable<Expense> {
    return this.api.get<Expense>(`/api/trips/${tripId}/expenses/${expenseId}`);
  }
}
