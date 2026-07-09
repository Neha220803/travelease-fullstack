import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import { ProviderDashboardResponse } from '@app/features/transport/services/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getDashboard(): Observable<ProviderDashboardResponse> {
    return this.http
      .get<ApiResponse<ProviderDashboardResponse>>(`${API_BASE_URL}/api/analytics/dashboard`)
      .pipe(map((response) => response.data));
  }
}
