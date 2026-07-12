import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import {
  ActivityRecommendation,
  Recommendation,
} from '@app/core/recommendations/recommendation.models';

@Injectable({ providedIn: 'root' })
export class RecommendationsService {
  private readonly http = inject(HttpClient);

  getRecommendations(categoryId: number): Observable<Recommendation[]> {
    const params = new HttpParams().set('categoryId', categoryId);
    return this.http.get<Recommendation[]>(`${API_BASE_URL}/api/recommendations`, { params });
  }

  /** Same endpoint, narrowed to a destination and typed with the enriched activity fields. */
  getActivityRecommendations(categoryId: number, destinationId: number): Observable<ActivityRecommendation[]> {
    const params = new HttpParams().set('categoryId', categoryId).set('destinationId', destinationId);
    return this.http.get<ActivityRecommendation[]>(`${API_BASE_URL}/api/recommendations`, { params });
  }
}
