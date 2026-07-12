import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import { BusFormPayload, BusResponse } from '@app/features/transport/services/bus.models';
import { BusStatus } from '@app/features/transport/services/transport-enums';

/**
 * BusRequest.providerId is @NotNull @Positive for Bean Validation. It is
 * NOT unconditionally discarded server-side: BusController calls
 * securityUtil.resolveEffectiveProviderId(request.getProviderId()), which
 * (per SecurityUtil.java) returns the caller's own providerId when the
 * value is null, but THROWS AccessDeniedException("Providers may only
 * access their own providerId") when a non-null value is supplied that
 * does not match the caller's own id. A hardcoded placeholder (e.g. 0)
 * therefore always fails in production for any real authenticated
 * provider. The only value that is always both valid (@Positive, non-null)
 * and guaranteed to pass the backend's own-identity check is the caller's
 * own real providerId — so callers must supply it here, sourced from
 * StoredUser.providerId (never a user-facing provider selector).
 */

@Injectable({ providedIn: 'root' })
export class BusService {
  private readonly http = inject(HttpClient);

  listBuses(providerId: number, status?: BusStatus): Observable<BusResponse[]> {
    let params = new HttpParams().set('providerId', providerId);
    if (status != null) {
      params = params.set('status', status);
    }
    return this.http
      .get<ApiResponse<BusResponse[]>>(`${API_BASE_URL}/api/buses`, { params })
      .pipe(map((response) => response.data));
  }

  createBus(payload: BusFormPayload, providerId: number): Observable<BusResponse> {
    return this.http
      .post<ApiResponse<BusResponse>>(`${API_BASE_URL}/api/buses`, {
        ...payload,
        providerId,
      })
      .pipe(map((response) => response.data));
  }

  updateBus(id: number, payload: BusFormPayload, providerId: number): Observable<BusResponse> {
    return this.http
      .put<ApiResponse<BusResponse>>(`${API_BASE_URL}/api/buses/${id}`, {
        ...payload,
        providerId,
      })
      .pipe(map((response) => response.data));
  }

  deleteBus(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<{ message: string }>>(`${API_BASE_URL}/api/buses/${id}`)
      .pipe(map(() => undefined));
  }
}
