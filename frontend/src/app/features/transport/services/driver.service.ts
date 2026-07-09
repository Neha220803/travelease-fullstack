import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  DriverCreatePayload, DriverEditPayload, DriverResponse,
} from '@app/features/transport/services/staff.models';

/** DriverRequest.providerId is @NotNull but always server-overwritten (Category 5). */
const PROVIDER_ID_PLACEHOLDER = 0;

@Injectable({ providedIn: 'root' })
export class DriverService {
  private readonly http = inject(HttpClient);

  listDrivers(): Observable<DriverResponse[]> {
    return this.http
      .get<ApiResponse<DriverResponse[]>>(`${API_BASE_URL}/api/operations/drivers`)
      .pipe(map((response) => response.data));
  }

  createDriver(payload: DriverCreatePayload): Observable<DriverResponse> {
    return this.http
      .post<ApiResponse<DriverResponse>>(`${API_BASE_URL}/api/operations/drivers`, {
        ...payload,
        providerId: PROVIDER_ID_PLACEHOLDER,
      })
      .pipe(map((response) => response.data));
  }

  updateDriver(id: number, payload: DriverEditPayload): Observable<DriverResponse> {
    return this.http
      .put<ApiResponse<DriverResponse>>(`${API_BASE_URL}/api/operations/drivers/${id}`, {
        ...payload,
        providerId: PROVIDER_ID_PLACEHOLDER,
      })
      .pipe(map((response) => response.data));
  }

  deactivateDriver(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<{ message: string }>>(`${API_BASE_URL}/api/operations/drivers/${id}`)
      .pipe(map(() => undefined));
  }
}
