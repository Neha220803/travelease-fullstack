import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private api = inject(ApiService);

  getExpenses(tripId: string): Observable<any> {
    return this.api.get<any>(`/api/trips/${tripId}/expenses`);
  }

  createExpense(tripId: string, data: any): Observable<any> {
    return this.api.post<any>(`/api/trips/${tripId}/expenses`, data);
  }
}
