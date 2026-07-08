import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import { AccommodationSummary } from '@app/features/trips/services/accommodation.models';

@Injectable({ providedIn: 'root' })
export class AccommodationService {
  private readonly http = inject(HttpClient);

  getAccommodationSummary(tripId: string): Observable<AccommodationSummary> {
    return this.http
      .get<ApiResponse<AccommodationSummary>>(`${API_BASE_URL}/api/trips/${tripId}/accommodation-summary`)
      .pipe(map((response) => response.data));
  }
}
