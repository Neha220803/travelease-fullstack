import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SettlementService {
  private api = inject(ApiService);

  getSettlementsMe(tripId: string): Observable<any> {
    return this.api.get<any>(`/api/trips/${tripId}/settlements/me`);
  }

  getSettlementsSummary(tripId: string): Observable<any> {
    return this.api.get<any>(`/api/trips/${tripId}/settlements/summary`);
  }
}
