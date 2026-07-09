import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  ConductorCreatePayload, ConductorEditPayload, ConductorResponse,
} from '@app/features/transport/services/staff.models';

const PROVIDER_ID_PLACEHOLDER = 0;

@Injectable({ providedIn: 'root' })
export class ConductorService {
  private readonly http = inject(HttpClient);

  listConductors(): Observable<ConductorResponse[]> {
    return this.http
      .get<ApiResponse<ConductorResponse[]>>(`${API_BASE_URL}/api/operations/conductors`)
      .pipe(map((response) => response.data));
  }

  createConductor(payload: ConductorCreatePayload): Observable<ConductorResponse> {
    return this.http
      .post<ApiResponse<ConductorResponse>>(`${API_BASE_URL}/api/operations/conductors`, {
        ...payload,
        providerId: PROVIDER_ID_PLACEHOLDER,
      })
      .pipe(map((response) => response.data));
  }

  updateConductor(id: number, payload: ConductorEditPayload): Observable<ConductorResponse> {
    return this.http
      .put<ApiResponse<ConductorResponse>>(`${API_BASE_URL}/api/operations/conductors/${id}`, {
        ...payload,
        providerId: PROVIDER_ID_PLACEHOLDER,
      })
      .pipe(map((response) => response.data));
  }

  deactivateConductor(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<{ message: string }>>(`${API_BASE_URL}/api/operations/conductors/${id}`)
      .pipe(map(() => undefined));
  }
}
