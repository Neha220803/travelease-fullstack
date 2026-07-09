import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  BusSearchResult,
  TripBusBookingSummary,
  SeatLayoutResponse,
  BookingRequest,
  BookingResponse,
  TripBusBooking,
} from '@app/features/trips/services/schedule.models';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly http = inject(HttpClient);

  searchBuses(source: string, destination: string, date: string): Observable<BusSearchResult[]> {
    const params = new HttpParams().set('source', source).set('destination', destination).set('date', date);
    return this.http
      .get<ApiResponse<BusSearchResult[]>>(`${API_BASE_URL}/api/schedules/search`, { params })
      .pipe(map((response) => response.data));
  }

  getTripBusBookings(tripId: string): Observable<TripBusBookingSummary> {
    return this.http
      .get<ApiResponse<TripBusBookingSummary>>(`${API_BASE_URL}/api/trips/${tripId}/bus-bookings`)
      .pipe(map((response) => response.data));
  }

  getSeats(scheduleId: number): Observable<SeatLayoutResponse> {
    const params = new HttpParams().set('scheduleId', scheduleId.toString());
    return this.http
      .get<ApiResponse<SeatLayoutResponse>>(`${API_BASE_URL}/api/seats`, { params })
      .pipe(map((response) => response.data));
  }

  createBooking(request: BookingRequest): Observable<BookingResponse> {
    return this.http
      .post<ApiResponse<BookingResponse>>(`${API_BASE_URL}/api/bookings`, request)
      .pipe(map((response) => response.data));
  }

  attachBookingToTrip(tripId: string, bookingId: number): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(`${API_BASE_URL}/api/trips/${tripId}/bus-bookings`, { bookingId })
      .pipe(map((response) => response.data));
  }
}
