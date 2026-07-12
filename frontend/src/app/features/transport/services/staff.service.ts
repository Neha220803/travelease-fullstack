import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import { StaffCreatePayload, StaffEditPayload, StaffResponse } from '@app/features/transport/services/staff.models';
import { StaffType } from '@app/features/transport/services/transport-enums';

/**
 * StaffRequest.providerId is @NotNull. It is NOT unconditionally discarded
 * server-side: FleetOperationController calls
 * securityUtil.resolveEffectiveProviderId(request.getProviderId()), which
 * throws AccessDeniedException("Providers may only access their own
 * providerId") when a non-null value doesn't match the caller's own id.
 * A hardcoded placeholder therefore always fails for a real authenticated
 * provider. Callers must supply the caller's own real providerId here,
 * sourced from StoredUser.providerId (never a user-facing selector).
 */

@Injectable({ providedIn: 'root' })
export class StaffService {
  private readonly http = inject(HttpClient);

  listStaff(staffType?: StaffType): Observable<StaffResponse[]> {
    let params = new HttpParams();
    if (staffType != null) {
      params = params.set('staffType', staffType);
    }
    return this.http
      .get<ApiResponse<StaffResponse[]>>(`${API_BASE_URL}/api/operations/staff`, { params })
      .pipe(map((response) => response.data));
  }

  createStaff(payload: StaffCreatePayload, providerId: number): Observable<StaffResponse> {
    return this.http
      .post<ApiResponse<StaffResponse>>(`${API_BASE_URL}/api/operations/staff`, {
        ...payload,
        providerId,
      })
      .pipe(map((response) => response.data));
  }

  updateStaff(id: number, payload: StaffEditPayload, providerId: number): Observable<StaffResponse> {
    return this.http
      .put<ApiResponse<StaffResponse>>(`${API_BASE_URL}/api/operations/staff/${id}`, {
        ...payload,
        providerId,
      })
      .pipe(map((response) => response.data));
  }

  deactivateStaff(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<{ message: string }>>(`${API_BASE_URL}/api/operations/staff/${id}`)
      .pipe(map(() => undefined));
  }
}
