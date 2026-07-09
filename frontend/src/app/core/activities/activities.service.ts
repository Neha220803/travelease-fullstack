import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { Activity, ActivityProviderOption } from '@app/core/activities/activity.models';

@Injectable({ providedIn: 'root' })
export class ActivitiesService {
  private readonly http = inject(HttpClient);

  getActivities(destinationId: number): Observable<Activity[]> {
    const params = new HttpParams().set('destinationId', destinationId);
    return this.http.get<Activity[]>(`${API_BASE_URL}/api/activities`, { params });
  }

  getProviders(destinationId: number): Observable<ActivityProviderOption[]> {
    const params = new HttpParams().set('destinationId', destinationId);
    return this.http.get<ActivityProviderOption[]>(`${API_BASE_URL}/api/activities/providers`, { params });
  }
}
