import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  ConductorCreatePayload, ConductorEditPayload, ConductorResponse,
} from '@app/features/transport/services/staff.models';

/**
 * ConductorRequest.providerId is @NotNull. It is NOT unconditionally
 * discarded server-side: FleetOperationController calls
 * securityUtil.resolveEffectiveProviderId(request.getProviderId()), which
 * throws AccessDeniedException("Providers may only access their own
 * providerId") when a non-null value doesn't match the caller's own id.
 * A hardcoded placeholder therefore always fails for a real authenticated
 * provider. Callers must supply the caller's own real providerId here,
 * sourced from StoredUser.providerId (never a user-facing selector).
 */

@Injectable({ providedIn: 'root' })
export class ConductorService {
  private readonly http = inject(HttpClient);

  listConductors(): Observable<ConductorResponse[]> {
    return this.http
      .get<ApiResponse<ConductorResponse[]>>(`${API_BASE_URL}/api/operations/conductors`)
      .pipe(map((response) => response.data));
  }

  createConductor(payload: ConductorCreatePayload, providerId: number): Observable<ConductorResponse> {
    return this.http
      .post<ApiResponse<ConductorResponse>>(`${API_BASE_URL}/api/operations/conductors`, {
        ...payload,
        providerId,
      })
      .pipe(map((response) => response.data));
  }

  updateConductor(id: number, payload: ConductorEditPayload, providerId: number): Observable<ConductorResponse> {
    return this.http
      .put<ApiResponse<ConductorResponse>>(`${API_BASE_URL}/api/operations/conductors/${id}`, {
        ...payload,
        providerId,
      })
      .pipe(map((response) => response.data));
  }

  deactivateConductor(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<{ message: string }>>(`${API_BASE_URL}/api/operations/conductors/${id}`)
      .pipe(map(() => undefined));
  }
}
