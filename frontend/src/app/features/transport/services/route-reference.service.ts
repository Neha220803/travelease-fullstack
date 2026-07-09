import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import { RouteReferenceResponse } from '@app/features/transport/services/route-reference.models';

/**
 * Route is admin-owned master reference data — POST/PUT/DELETE /api/routes
 * are hasRole('ADMIN') only. This service is intentionally read-only.
 */
@Injectable({ providedIn: 'root' })
export class RouteReferenceService {
  private readonly http = inject(HttpClient);

  listActiveRoutes(): Observable<RouteReferenceResponse[]> {
    const params = new HttpParams().set('status', 'ACTIVE');
    return this.http
      .get<ApiResponse<RouteReferenceResponse[]>>(`${API_BASE_URL}/api/routes`, { params })
      .pipe(map((response) => response.data));
  }
}
