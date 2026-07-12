import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  MaintenanceFormPayload,
  MaintenanceResponse,
  MaintenanceTransitionPayload,
} from '@app/features/transport/services/maintenance.models';
import { MaintenanceStatus } from '@app/features/transport/services/transport-enums';

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private readonly http = inject(HttpClient);

  listMaintenance(busId?: number, status?: MaintenanceStatus): Observable<MaintenanceResponse[]> {
    let params = new HttpParams();
    if (busId != null) {
      params = params.set('busId', busId);
    }
    if (status != null) {
      params = params.set('status', status);
    }
    return this.http
      .get<ApiResponse<MaintenanceResponse[]>>(`${API_BASE_URL}/api/operations/maintenance`, { params })
      .pipe(map((response) => response.data));
  }

  scheduleMaintenance(payload: MaintenanceFormPayload): Observable<MaintenanceResponse> {
    return this.http
      .post<ApiResponse<MaintenanceResponse>>(`${API_BASE_URL}/api/operations/maintenance`, payload)
      .pipe(map((response) => response.data));
  }

  updateMaintenance(id: number, payload: MaintenanceFormPayload): Observable<MaintenanceResponse> {
    return this.http
      .put<ApiResponse<MaintenanceResponse>>(`${API_BASE_URL}/api/operations/maintenance/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  transitionStatus(id: number, payload: MaintenanceTransitionPayload): Observable<MaintenanceResponse> {
    return this.http
      .patch<ApiResponse<MaintenanceResponse>>(`${API_BASE_URL}/api/operations/maintenance/${id}/status`, payload)
      .pipe(map((response) => response.data));
  }
}
