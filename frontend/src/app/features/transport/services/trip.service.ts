import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  FleetAvailabilityResponse, TripAssignmentPayload, TripResponse, TripTransitionPayload,
} from '@app/features/transport/services/trip.models';

@Injectable({ providedIn: 'root' })
export class TripService {
  private readonly http = inject(HttpClient);

  listTrips(): Observable<TripResponse[]> {
    return this.http
      .get<ApiResponse<TripResponse[]>>(`${API_BASE_URL}/api/operations/trips`)
      .pipe(map((response) => response.data));
  }

  assignTrip(payload: TripAssignmentPayload): Observable<TripResponse> {
    return this.http
      .post<ApiResponse<TripResponse>>(`${API_BASE_URL}/api/operations/trips/assign`, payload)
      .pipe(map((response) => response.data));
  }

  transitionStatus(id: number, payload: TripTransitionPayload): Observable<TripResponse> {
    return this.http
      .patch<ApiResponse<TripResponse>>(`${API_BASE_URL}/api/operations/trips/${id}/status`, payload)
      .pipe(map((response) => response.data));
  }

  getFleetAvailability(providerId: number): Observable<FleetAvailabilityResponse> {
    return this.http
      .get<ApiResponse<FleetAvailabilityResponse>>(`${API_BASE_URL}/api/operations/fleet/availability/${providerId}`)
      .pipe(map((response) => response.data));
  }
}
