import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Itinerary, ItineraryActivity } from '@app/core/models/itinerary.model';
import { MOCK_ITINERARY } from '@app/core/data/mock-data';

@Injectable({ providedIn: 'root' })
export class ItineraryDummyService {
  /** TODO: POST /api/itineraries */
  createItinerary(tripId: string): Observable<Itinerary> {
    return of({ ...MOCK_ITINERARY, tripId }).pipe(delay(500));
  }

  /** TODO: GET /api/itineraries?tripId= */
  getItinerary(tripId: string): Observable<Itinerary | null> {
    if (tripId === MOCK_ITINERARY.tripId) {
      return of(MOCK_ITINERARY).pipe(delay(400));
    }
    return of(null).pipe(delay(300));
  }

  /** TODO: POST /api/itineraries/{itineraryId}/activities */
  addActivity(itineraryId: string, activity: Partial<ItineraryActivity>): Observable<Itinerary> {
    const newActivity: ItineraryActivity = {
      id: `ia${Date.now()}`,
      itineraryId,
      activityName: activity.activityName ?? 'New Activity',
      date: activity.date ?? '',
      startTime: activity.startTime ?? '',
      completed: false,
      ...activity,
    };
    return of({ ...MOCK_ITINERARY, activities: [...MOCK_ITINERARY.activities, newActivity] }).pipe(delay(500));
  }

  /** TODO: DELETE /api/itineraries/{itineraryId}/activities/{activityId} */
  removeActivity(itineraryId: string, activityId: string): Observable<Itinerary> {
    const updated = {
      ...MOCK_ITINERARY,
      activities: MOCK_ITINERARY.activities.filter(a => a.id !== activityId),
    };
    return of(updated).pipe(delay(400));
  }

  /** TODO: PATCH /api/itineraries/{itineraryId}/activities/{activityId}/complete */
  markComplete(itineraryId: string, activityId: string): Observable<Itinerary> {
    const updated = {
      ...MOCK_ITINERARY,
      activities: MOCK_ITINERARY.activities.map(a =>
        a.id === activityId ? { ...a, completed: true, completedAt: new Date().toISOString() } : a
      ),
    };
    return of(updated).pipe(delay(400));
  }
}
