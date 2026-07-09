import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  BookingAnalyticsResponse, RevenueAnalyticsResponse,
} from '@app/features/transport/services/booking-analytics.models';

function dateRangeParams(from?: string, to?: string): HttpParams {
  let params = new HttpParams();
  if (from) params = params.set('from', from);
  if (to) params = params.set('to', to);
  return params;
}

@Injectable({ providedIn: 'root' })
export class BookingAnalyticsService {
  private readonly http = inject(HttpClient);

  getBookingAnalytics(from?: string, to?: string): Observable<BookingAnalyticsResponse> {
    return this.http
      .get<ApiResponse<BookingAnalyticsResponse>>(`${API_BASE_URL}/api/analytics/bookings`, {
        params: dateRangeParams(from, to),
      })
      .pipe(map((response) => response.data));
  }

  getRevenueAnalytics(from?: string, to?: string): Observable<RevenueAnalyticsResponse> {
    return this.http
      .get<ApiResponse<RevenueAnalyticsResponse>>(`${API_BASE_URL}/api/analytics/revenue`, {
        params: dateRangeParams(from, to),
      })
      .pipe(map((response) => response.data));
  }
}
