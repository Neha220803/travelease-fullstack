import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  DriverCreatePayload, DriverEditPayload, DriverResponse,
} from '@app/features/transport/services/staff.models';

/**
 * DriverRequest.providerId is @NotNull. It is NOT unconditionally discarded
 * server-side: FleetOperationController calls
 * securityUtil.resolveEffectiveProviderId(request.getProviderId()), which
 * throws AccessDeniedException("Providers may only access their own
 * providerId") when a non-null value doesn't match the caller's own id.
 * A hardcoded placeholder therefore always fails for a real authenticated
 * provider. Callers must supply the caller's own real providerId here,
 * sourced from StoredUser.providerId (never a user-facing selector).
 */

@Injectable({ providedIn: 'root' })
export class DriverService {
  private readonly http = inject(HttpClient);

  listDrivers(): Observable<DriverResponse[]> {
    return this.http
      .get<ApiResponse<DriverResponse[]>>(`${API_BASE_URL}/api/operations/drivers`)
      .pipe(map((response) => response.data));
  }

  createDriver(payload: DriverCreatePayload, providerId: number): Observable<DriverResponse> {
    return this.http
      .post<ApiResponse<DriverResponse>>(`${API_BASE_URL}/api/operations/drivers`, {
        ...payload,
        providerId,
      })
      .pipe(map((response) => response.data));
  }

  updateDriver(id: number, payload: DriverEditPayload, providerId: number): Observable<DriverResponse> {
    return this.http
      .put<ApiResponse<DriverResponse>>(`${API_BASE_URL}/api/operations/drivers/${id}`, {
        ...payload,
        providerId,
      })
      .pipe(map((response) => response.data));
  }

  deactivateDriver(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<{ message: string }>>(`${API_BASE_URL}/api/operations/drivers/${id}`)
      .pipe(map(() => undefined));
  }
}
