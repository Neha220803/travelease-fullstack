import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Notification, DepartureSuggestion } from '@app/core/models/notification.model';
import { MOCK_NOTIFICATIONS } from '@app/core/data/mock-data';

const MOCK_DEPARTURE_SUGGESTIONS: DepartureSuggestion[] = [
  {
    id: 'ds1',
    tripId: 'trip1',
    tripName: 'Goa Beach Escape',
    activityName: 'Parasailing at Baga Beach',
    activityTime: '10:30',
    suggestedDepartureTime: '09:45',
    travelDurationMinutes: 25,
    message: 'Leave by 09:45 to reach Baga Beach 20 minutes early for your parasailing slot.',
  },
  {
    id: 'ds2',
    tripId: 'trip2',
    tripName: 'Manali Snow Adventure',
    activityName: 'Rohtang Pass Trek',
    activityTime: '05:30',
    suggestedDepartureTime: '04:45',
    travelDurationMinutes: 45,
    message: 'Leave by 04:45 — Rohtang is 50km away and traffic builds up by 06:00.',
  },
];

@Injectable({ providedIn: 'root' })
export class NotificationsDummyService {
  /** TODO: GET /api/notifications */
  getNotifications(): Observable<Notification[]> {
    return of([...MOCK_NOTIFICATIONS]).pipe(delay(400));
  }

  /** TODO: PATCH /api/notifications/{notificationId}/read */
  markRead(notificationId: string): Observable<Notification> {
    const notif = MOCK_NOTIFICATIONS.find(n => n.id === notificationId) ?? MOCK_NOTIFICATIONS[0];
    return of({ ...notif, read: true }).pipe(delay(300));
  }

  /** TODO: GET /api/notifications/departure-suggestions */
  getDepartureSuggestions(): Observable<DepartureSuggestion[]> {
    return of(MOCK_DEPARTURE_SUGGESTIONS).pipe(delay(400));
  }
}
