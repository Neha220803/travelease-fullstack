import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '@app/core/api/api-client.service';
import { Settlement, SettlementSummary } from '@app/core/models/settlement.model';

@Injectable({ providedIn: 'root' })
export class SettlementService {
  private readonly api = inject(ApiClientService);

  /** GET /api/trips/{tripId}/settlements/me */
  getMySettlements(tripId: string): Observable<Settlement[]> {
    return this.api.get<Settlement[]>(`/api/trips/${tripId}/settlements/me`);
  }

  /** GET /api/trips/{tripId}/settlements/summary */
  getSettlementSummary(tripId: string): Observable<SettlementSummary> {
    return this.api.get<SettlementSummary>(`/api/trips/${tripId}/settlements/summary`);
  }

  /** PATCH /api/settlements/{settlementId}/paid */
  markPaid(settlementId: string): Observable<Settlement> {
    return this.api.patch<Settlement>(`/api/settlements/${settlementId}/paid`);
  }
}
