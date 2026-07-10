import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import {
  CreateItineraryPayload,
  ItineraryItem,
  ItineraryProgress,
} from '@app/features/trips/services/itinerary.models';

@Injectable({ providedIn: 'root' })
export class ItineraryService {
  private readonly http = inject(HttpClient);

  /**
   * Last-known progress per trip, kept live so sibling tabs (e.g. the
   * Overview tab's "Itinerary Finalized" timeline step) reflect changes made
   * in the Itinerary tab without needing a page reload.
   */
  private readonly progressByTrip = signal<Record<string, ItineraryProgress>>({});

  progressFor(tripId: string): ItineraryProgress | null {
    return this.progressByTrip()[tripId] ?? null;
  }

  list(tripId: string): Observable<ItineraryItem[]> {
    const params = new HttpParams().set('tripId', tripId);
    return this.http.get<ItineraryItem[]>(`${API_BASE_URL}/api/itinerary`, { params });
  }

  create(payload: CreateItineraryPayload): Observable<ItineraryItem> {
    return this.http.post<ItineraryItem>(`${API_BASE_URL}/api/itinerary`, payload);
  }

  update(itineraryId: string, payload: CreateItineraryPayload): Observable<ItineraryItem> {
    return this.http.put<ItineraryItem>(`${API_BASE_URL}/api/itinerary/${itineraryId}`, payload);
  }

  remove(itineraryId: string): Observable<void> {
    return this.http
      .delete<{ message: string }>(`${API_BASE_URL}/api/itinerary/${itineraryId}`)
      .pipe(map(() => undefined));
  }

  getProgress(tripId: string): Observable<ItineraryProgress> {
    const params = new HttpParams().set('tripId', tripId);
    return this.http.get<ItineraryProgress>(`${API_BASE_URL}/api/itinerary/progress`, { params }).pipe(
      tap((progress) => this.progressByTrip.update((cache) => ({ ...cache, [tripId]: progress }))),
    );
  }
}
