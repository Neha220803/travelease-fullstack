import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import {
  CreateItineraryPayload,
  ItineraryItem,
  ItineraryProgress,
} from '@app/features/trips/services/itinerary.models';

@Injectable({ providedIn: 'root' })
export class ItineraryService {
  private readonly http = inject(HttpClient);

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
    return this.http.get<ItineraryProgress>(`${API_BASE_URL}/api/itinerary/progress`, { params });
  }
}
