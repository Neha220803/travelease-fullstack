import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Delay, DelayImpact, RescheduleSuggestion } from '@app/core/models/delay.model';
import { Itinerary } from '@app/core/models/itinerary.model';
import { MOCK_DELAYS, MOCK_RESCHEDULE_SUGGESTIONS, MOCK_ITINERARY } from '@app/core/data/mock-data';

@Injectable({ providedIn: 'root' })
export class DelaysDummyService {
  /** TODO: POST /api/delays */
  reportDelay(tripId: string, durationMinutes: number, reason: string, notes?: string): Observable<Delay> {
    const d: Delay = {
      id: `del${Date.now()}`,
      tripId,
      reportedAt: new Date().toISOString(),
      durationMinutes,
      reason: reason as Delay['reason'],
      notes,
    };
    return of(d).pipe(delay(500));
  }

  /** TODO: GET /api/trips/{tripId}/delays */
  getTripDelays(tripId: string): Observable<Delay[]> {
    return of(MOCK_DELAYS.filter(d => d.tripId === tripId)).pipe(delay(400));
  }

  /** TODO: GET /api/delays/{delayId}/impact-analysis */
  getImpactAnalysis(delayId: string): Observable<DelayImpact> {
    const impact: DelayImpact = {
      delayId,
      affectedActivities: [
        { activityId: 'act3', activityName: 'Snow Trekking – Rohtang Pass', scheduledTime: '05:30', impactType: 'RESCHEDULABLE' },
      ],
    };
    return of(impact).pipe(delay(600));
  }

  /** TODO: GET /api/delays/{delayId}/reschedule-suggestions */
  getRescheduleSuggestions(delayId: string): Observable<RescheduleSuggestion[]> {
    return of(MOCK_RESCHEDULE_SUGGESTIONS.filter(s => s.delayId === delayId)).pipe(delay(500));
  }

  /** TODO: POST /api/delays/{delayId}/accept-suggestion */
  acceptSuggestion(delayId: string, suggestionId: string): Observable<Itinerary> {
    return of(MOCK_ITINERARY).pipe(delay(600));
  }
}
