import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Activity, ActivityBooking, ActivityCapacitySlot } from '@app/core/models/activity.model';
import { MOCK_ACTIVITIES, MOCK_ACTIVITY_BOOKINGS, MOCK_CAPACITY_SLOTS } from '@app/core/data/mock-data';

@Injectable({ providedIn: 'root' })
export class ActivityProviderDummyService {
  /** TODO: GET /api/activity-provider/activities */
  getActivities(): Observable<Activity[]> {
    return of([...MOCK_ACTIVITIES]).pipe(delay(400));
  }

  /** TODO: POST /api/activity-provider/activities */
  createActivity(data: Partial<Activity>): Observable<Activity> {
    return of({ id: `act${Date.now()}`, ...data } as Activity).pipe(delay(600));
  }

  /** TODO: PUT /api/activity-provider/activities/{activityId} */
  updateActivity(activityId: string, data: Partial<Activity>): Observable<Activity> {
    const existing = MOCK_ACTIVITIES.find(a => a.id === activityId) ?? MOCK_ACTIVITIES[0];
    return of({ ...existing, ...data }).pipe(delay(500));
  }

  /** TODO: GET /api/activity-provider/bookings */
  getBookings(): Observable<ActivityBooking[]> {
    return of([...MOCK_ACTIVITY_BOOKINGS]).pipe(delay(400));
  }

  /** TODO: GET /api/activity-provider/capacity */
  getCapacitySlots(activityId?: string): Observable<ActivityCapacitySlot[]> {
    const slots = activityId
      ? MOCK_CAPACITY_SLOTS.filter(s => s.activityId === activityId)
      : [...MOCK_CAPACITY_SLOTS];
    return of(slots).pipe(delay(400));
  }

  /** TODO: GET /api/activity-provider/reports */
  getReports(): Observable<{ month: string; revenue: number; bookings: number; utilization: number }[]> {
    return of([
      { month: 'Jan', revenue: 85000, bookings: 120, utilization: 65 },
      { month: 'Feb', revenue: 102000, bookings: 145, utilization: 72 },
      { month: 'Mar', revenue: 135000, bookings: 192, utilization: 85 },
      { month: 'Apr', revenue: 118000, bookings: 168, utilization: 79 },
      { month: 'May', revenue: 95000, bookings: 135, utilization: 70 },
      { month: 'Jun', revenue: 110000, bookings: 157, utilization: 76 },
    ]).pipe(delay(500));
  }
}
