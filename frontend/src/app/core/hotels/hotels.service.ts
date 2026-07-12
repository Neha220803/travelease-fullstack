import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import { Hotel } from '@app/core/hotels/hotel.models';

@Injectable({ providedIn: 'root' })
export class HotelsService {
  private readonly http = inject(HttpClient);

  searchHotels(destinationId: number, query?: string): Observable<Hotel[]> {
    let params = new HttpParams().set('destinationId', destinationId);
    if (query) {
      params = params.set('q', query);
    }
    return this.http
      .get<ApiResponse<Hotel[]>>(`${API_BASE_URL}/api/hotels`, { params })
      .pipe(map((response) => response.data));
  }

  createBooking(payload: {
    tripId?: string;
    hotelId: string;
    checkInDate: string;
    checkOutDate: string;
    roomType: string;
    lockedRoomId?: string;
    guestDetails?: { name: string; age: number; gender: string; isPrimary: boolean }[];
    contactEmail?: string;
    contactPhone?: string;
  }): Observable<{ hotelBookingId: string }> {
    return this.http
      .post<ApiResponse<{ hotelBookingId: string }>>(`${API_BASE_URL}/api/hotel-bookings`, payload)
      .pipe(map((response) => response.data));
  }

  lockRoom(payload: {
    hotelId: string;
    roomType: string;
    checkInDate: string;
    checkOutDate: string;
  }): Observable<{ lockId: number; roomId: string; lockedAt: string; expiresAt: string; status: string }> {
    return this.http
      .post<ApiResponse<{ lockId: number; roomId: string; lockedAt: string; expiresAt: string; status: string }>>(
        `${API_BASE_URL}/api/hotel-bookings/lock`,
        payload
      )
      .pipe(map((response) => response.data));
  }

  unlockRoom(roomId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${API_BASE_URL}/api/hotel-bookings/lock/${roomId}`)
      .pipe(map(() => void 0));
  }
}
