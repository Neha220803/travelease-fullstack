import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import { ScheduleFormPayload, ScheduleResponse } from '@app/features/transport/services/schedule.models';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly http = inject(HttpClient);

  /**
   * GET /api/schedules has no server-side scoping mechanism at all (no
   * providerId/status/busId param, no role restriction) — it returns every
   * provider's schedules. This method applies a client-side display filter
   * only; it is not an authorization boundary. Backend mutation ownership
   * (assertOwnsSchedule/assertOwnsBus) remains authoritative.
   */
  listMySchedules(providerId: number): Observable<ScheduleResponse[]> {
    return this.http
      .get<ApiResponse<ScheduleResponse[]>>(`${API_BASE_URL}/api/schedules`)
      .pipe(map((response) => response.data.filter((s) => s.bus.providerId === providerId)));
  }

  createSchedule(payload: ScheduleFormPayload): Observable<ScheduleResponse> {
    return this.http
      .post<ApiResponse<ScheduleResponse>>(`${API_BASE_URL}/api/schedules`, payload)
      .pipe(map((response) => response.data));
  }

  updateSchedule(id: number, payload: ScheduleFormPayload): Observable<ScheduleResponse> {
    return this.http
      .put<ApiResponse<ScheduleResponse>>(`${API_BASE_URL}/api/schedules/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  cancelSchedule(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<{ message: string }>>(`${API_BASE_URL}/api/schedules/${id}`)
      .pipe(map(() => undefined));
  }
}
