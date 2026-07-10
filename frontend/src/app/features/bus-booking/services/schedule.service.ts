import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  BusSearchResult,
  SeatLayoutResponse,
  SeatLockRequest,
  SeatLockResponse,
  FareCalculationRequest,
  PriceCalculatorResponse,
  CancellationPreviewResponse,
} from '@app/features/bus-booking/services/schedule.models';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly http = inject(HttpClient);

  searchBuses(source: string, destination: string, date: string): Observable<BusSearchResult[]> {
    const params = new HttpParams().set('source', source).set('destination', destination).set('date', date);
    return this.http
      .get<ApiResponse<BusSearchResult[]>>(`${API_BASE_URL}/api/schedules/search`, { params })
      .pipe(map((response) => response.data));
  }

  getSeats(scheduleId: number): Observable<SeatLayoutResponse> {
    const params = new HttpParams().set('scheduleId', scheduleId.toString());
    return this.http
      .get<ApiResponse<SeatLayoutResponse>>(`${API_BASE_URL}/api/seats`, { params })
      .pipe(map((response) => response.data));
  }

  lockSeats(request: SeatLockRequest): Observable<SeatLockResponse> {
    return this.http
      .post<ApiResponse<SeatLockResponse>>(`${API_BASE_URL}/api/seats/lock`, request)
      .pipe(map((response) => response.data));
  }

  unlockSeats(scheduleId: number, seatIds: number[]): Observable<void> {
    let params = new HttpParams().set('scheduleId', scheduleId.toString());
    for (const id of seatIds) {
      params = params.append('seatIds', id.toString());
    }
    return this.http
      .delete<ApiResponse<void>>(`${API_BASE_URL}/api/seats/lock`, { params })
      .pipe(map((response) => response.data));
  }

  calculateFare(request: FareCalculationRequest): Observable<PriceCalculatorResponse> {
    return this.http
      .post<ApiResponse<PriceCalculatorResponse>>(`${API_BASE_URL}/api/fares/calculate`, request)
      .pipe(map((response) => response.data));
  }

  getCancellationPreview(scheduleId: number, totalFare: number): Observable<CancellationPreviewResponse> {
    const params = new HttpParams().set('totalFare', totalFare.toString());
    return this.http
      .get<ApiResponse<CancellationPreviewResponse>>(`${API_BASE_URL}/api/fares/cancellation-preview/${scheduleId}`, { params })
      .pipe(map((response) => response.data));
  }
}
