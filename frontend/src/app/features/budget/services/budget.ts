import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  private api = inject(ApiService);

  getBudgetMe(tripId: string): Observable<any> {
    return this.api.get<any>(`/api/trips/${tripId}/budget/me`);
  }

  getBudgetSummary(tripId: string): Observable<any> {
    return this.api.get<any>(`/api/trips/${tripId}/budget/summary`);
  }
}
