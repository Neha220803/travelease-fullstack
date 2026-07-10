import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  BookingRequest,
  BookingResponse,
  BookingHistoryResponse,
  BookingTimelineResponse,
  BookingModificationRequest,
  CancellationRequest,
  PartialCancellationRequest,
  CancellationResponse,
  RefundResponse,
  TicketResponse,
  PaginatedSearchResponse,
  TripBusBookingSummary,
} from '@app/features/bus-booking/services/booking.models';

export interface GetBookingsParams {
  scope?: 'UPCOMING' | 'PAST';
  status?: string;
  reference?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly http = inject(HttpClient);

  createBooking(request: BookingRequest): Observable<BookingResponse> {
    return this.http
      .post<ApiResponse<BookingResponse>>(`${API_BASE_URL}/api/bookings`, request)
      .pipe(map((response) => response.data));
  }

  getBookings(filters: GetBookingsParams): Observable<PaginatedSearchResponse<BookingHistoryResponse>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http
      .get<ApiResponse<PaginatedSearchResponse<BookingHistoryResponse>>>(`${API_BASE_URL}/api/bookings`, { params })
      .pipe(map((response) => response.data));
  }

  getBookingById(id: number): Observable<BookingResponse> {
    return this.http
      .get<ApiResponse<BookingResponse>>(`${API_BASE_URL}/api/bookings/${id}`)
      .pipe(map((response) => response.data));
  }

  getBookingTimeline(id: number): Observable<BookingTimelineResponse[]> {
    return this.http
      .get<ApiResponse<BookingTimelineResponse[]>>(`${API_BASE_URL}/api/bookings/${id}/timeline`)
      .pipe(map((response) => response.data));
  }

  modifyBooking(request: BookingModificationRequest): Observable<BookingResponse> {
    return this.http
      .put<ApiResponse<BookingResponse>>(`${API_BASE_URL}/api/bookings/modify`, request)
      .pipe(map((response) => response.data));
  }

  cancelBooking(id: number, request?: CancellationRequest): Observable<CancellationResponse> {
    return this.http
      .post<ApiResponse<CancellationResponse>>(`${API_BASE_URL}/api/bookings/${id}/cancel`, request ?? null)
      .pipe(map((response) => response.data));
  }

  partialCancelBooking(request: PartialCancellationRequest): Observable<CancellationResponse> {
    return this.http
      .post<ApiResponse<CancellationResponse>>(`${API_BASE_URL}/api/bookings/cancel/partial`, request)
      .pipe(map((response) => response.data));
  }

  getTicket(id: number): Observable<TicketResponse> {
    return this.http
      .get<ApiResponse<TicketResponse>>(`${API_BASE_URL}/api/bookings/${id}/ticket`)
      .pipe(map((response) => response.data));
  }

  verifyTicket(ticketNumber: string): Observable<TicketResponse> {
    return this.http
      .get<ApiResponse<TicketResponse>>(`${API_BASE_URL}/api/bookings/ticket/verify/${ticketNumber}`)
      .pipe(map((response) => response.data));
  }

  getRefundsByBooking(bookingId: number): Observable<RefundResponse[]> {
    const params = new HttpParams().set('bookingId', bookingId.toString());
    return this.http
      .get<ApiResponse<RefundResponse[]>>(`${API_BASE_URL}/api/refunds`, { params })
      .pipe(map((response) => response.data));
  }

  attachBookingToTrip(tripId: string, bookingId: number): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${API_BASE_URL}/api/trips/${tripId}/bus-bookings`, { bookingId })
      .pipe(map((response) => response.data));
  }

  removeBookingFromTrip(tripId: string, bookingId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${API_BASE_URL}/api/trips/${tripId}/bus-bookings/${bookingId}`)
      .pipe(map((response) => response.data));
  }

  getTripBusBookings(tripId: string): Observable<TripBusBookingSummary> {
    return this.http
      .get<ApiResponse<TripBusBookingSummary>>(`${API_BASE_URL}/api/trips/${tripId}/bus-bookings`)
      .pipe(map((response) => response.data));
  }
}
