import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import { BusFormPayload, BusResponse } from '@app/features/transport/services/bus.models';

/**
 * BusRequest.providerId is @NotNull for Bean Validation, but BusController
 * always overwrites it via SecurityUtil.resolveEffectiveProviderId before
 * persistence (Category 5 in the design spec). This placeholder only
 * satisfies validation and is never shown in any form.
 */
const PROVIDER_ID_PLACEHOLDER = 0;

@Injectable({ providedIn: 'root' })
export class BusService {
  private readonly http = inject(HttpClient);

  listBuses(providerId: number): Observable<BusResponse[]> {
    const params = new HttpParams().set('providerId', providerId);
    return this.http
      .get<ApiResponse<BusResponse[]>>(`${API_BASE_URL}/api/buses`, { params })
      .pipe(map((response) => response.data));
  }

  createBus(payload: BusFormPayload): Observable<BusResponse> {
    return this.http
      .post<ApiResponse<BusResponse>>(`${API_BASE_URL}/api/buses`, {
        ...payload,
        providerId: PROVIDER_ID_PLACEHOLDER,
      })
      .pipe(map((response) => response.data));
  }

  updateBus(id: number, payload: BusFormPayload): Observable<BusResponse> {
    return this.http
      .put<ApiResponse<BusResponse>>(`${API_BASE_URL}/api/buses/${id}`, {
        ...payload,
        providerId: PROVIDER_ID_PLACEHOLDER,
      })
      .pipe(map((response) => response.data));
  }

  deleteBus(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<{ message: string }>>(`${API_BASE_URL}/api/buses/${id}`)
      .pipe(map(() => undefined));
  }
}
