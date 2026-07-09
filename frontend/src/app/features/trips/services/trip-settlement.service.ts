import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  SettlementResponse,
  SettlementSummaryResponse,
} from '@app/features/trips/services/trip-expense.models';

@Injectable({ providedIn: 'root' })
export class TripSettlementService {
  private readonly http = inject(HttpClient);

  getSettlementSummary(tripId: string): Observable<SettlementSummaryResponse> {
    return this.http
      .get<ApiResponse<SettlementSummaryResponse>>(
        `${API_BASE_URL}/api/trips/${tripId}/settlements/summary`,
      )
      .pipe(map((response) => response.data));
  }

  getMySettlements(tripId: string): Observable<SettlementResponse[]> {
    return this.http
      .get<ApiResponse<SettlementResponse[]>>(
        `${API_BASE_URL}/api/trips/${tripId}/settlements/me`,
      )
      .pipe(map((response) => response.data));
  }

  markSettlementPaid(settlementId: string): Observable<SettlementResponse> {
    return this.http
      .patch<ApiResponse<SettlementResponse>>(
        `${API_BASE_URL}/api/settlements/${settlementId}/paid`,
        {},
      )
      .pipe(map((response) => response.data));
  }
}
