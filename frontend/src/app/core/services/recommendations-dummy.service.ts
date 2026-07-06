import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { type Recommendation } from '@app/core/models/delay.model';
import { MOCK_HOTELS, MOCK_ATTRACTIONS, MOCK_ACTIVITIES, MOCK_TRIPS } from '@app/core/data/mock-data';

@Injectable({ providedIn: 'root' })
export class RecommendationsDummyService {
  /** TODO: GET /api/recommendations/{tripId} */
  getRecommendations(tripId: string): Observable<Recommendation> {
    const trip = MOCK_TRIPS.find(t => t.id === tripId);
    const destId = trip?.destinationId ?? 'd1';

    return of({
      tripId,
      hotels: MOCK_HOTELS.filter(h => h.destinationId === destId),
      attractions: MOCK_ATTRACTIONS.filter(a => a.destinationId === destId),
      activities: MOCK_ACTIVITIES.filter(a => a.destinationId === destId),
    }).pipe(delay(600));
  }
}
