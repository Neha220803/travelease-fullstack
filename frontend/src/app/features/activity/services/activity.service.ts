import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  Activity,
  ActivityBooking,
  ActivityBookingStatus,
  ActivityOverview,
  ActivityPayload,
  ActivitySlot,
  ActivitySlotPayload,
} from '@app/features/activity/services/activity.models';

const BASE = `${API_BASE_URL}/api/activity-provider`;

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly http = inject(HttpClient);

  listActivities(): Observable<Activity[]> {
    return this.http
      .get<ApiResponse<Activity[]>>(`${BASE}/activities`)
      .pipe(map((response) => response.data));
  }

  getActivity(activityId: string): Observable<Activity> {
    return this.http
      .get<ApiResponse<Activity>>(`${BASE}/activities/${activityId}`)
      .pipe(map((response) => response.data));
  }

  createActivity(payload: ActivityPayload): Observable<Activity> {
    return this.http
      .post<ApiResponse<Activity>>(`${BASE}/activities`, payload)
      .pipe(map((response) => response.data));
  }

  updateActivity(activityId: string, payload: ActivityPayload): Observable<Activity> {
    return this.http
      .put<ApiResponse<Activity>>(`${BASE}/activities/${activityId}`, payload)
      .pipe(map((response) => response.data));
  }

  listSlots(activityId: string): Observable<ActivitySlot[]> {
    return this.http
      .get<ApiResponse<ActivitySlot[]>>(`${BASE}/activities/${activityId}/slots`)
      .pipe(map((response) => response.data));
  }

  createSlot(activityId: string, payload: ActivitySlotPayload): Observable<ActivitySlot> {
    return this.http
      .post<ApiResponse<ActivitySlot>>(`${BASE}/activities/${activityId}/slots`, payload)
      .pipe(map((response) => response.data));
  }

  updateSlot(
    activityId: string,
    slotId: string,
    payload: ActivitySlotPayload,
  ): Observable<ActivitySlot> {
    return this.http
      .put<ApiResponse<ActivitySlot>>(`${BASE}/activities/${activityId}/slots/${slotId}`, payload)
      .pipe(map((response) => response.data));
  }

  listBookingsForActivity(activityId: string): Observable<ActivityBooking[]> {
    return this.http
      .get<ApiResponse<ActivityBooking[]>>(`${BASE}/activities/${activityId}/bookings`)
      .pipe(map((response) => response.data));
  }

  getBooking(bookingId: string): Observable<ActivityBooking> {
    return this.http
      .get<ApiResponse<ActivityBooking>>(`${BASE}/bookings/${bookingId}`)
      .pipe(map((response) => response.data));
  }

  markAttendance(bookingId: string, status: ActivityBookingStatus): Observable<ActivityBooking> {
    return this.http
      .put<ApiResponse<ActivityBooking>>(`${BASE}/bookings/${bookingId}/attendance`, { status })
      .pipe(map((response) => response.data));
  }

  /** Activities for the current provider, each joined with its slots and bookings. */
  getProviderOverview(): Observable<ActivityOverview[]> {
    return this.listActivities().pipe(
      switchMap((activities) => {
        if (activities.length === 0) {
          return of([]);
        }
        return forkJoin(
          activities.map((activity) =>
            forkJoin({
              slots: this.listSlots(activity.activityId),
              bookings: this.listBookingsForActivity(activity.activityId),
            }).pipe(map(({ slots, bookings }) => ({ activity, slots, bookings }))),
          ),
        );
      }),
    );
  }
}
