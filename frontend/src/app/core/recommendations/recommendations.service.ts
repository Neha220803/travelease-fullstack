import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { Recommendation } from '@app/core/recommendations/recommendation.models';

@Injectable({ providedIn: 'root' })
export class RecommendationsService {
  private readonly http = inject(HttpClient);

  getRecommendations(categoryId: number): Observable<Recommendation[]> {
    const params = new HttpParams().set('categoryId', categoryId);
    return this.http.get<Recommendation[]>(`${API_BASE_URL}/api/recommendations`, { params });
  }
}
