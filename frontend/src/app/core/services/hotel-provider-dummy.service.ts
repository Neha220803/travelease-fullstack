import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Hotel, HotelRoom, HotelBooking, HotelReview } from '@app/core/models/hotel.model';
import { MOCK_HOTELS, MOCK_HOTEL_ROOMS, MOCK_HOTEL_BOOKINGS, MOCK_HOTEL_REVIEWS } from '@app/core/data/mock-data';

@Injectable({ providedIn: 'root' })
export class HotelProviderDummyService {
  /** TODO: GET /api/hotel-provider/properties */
  getProperties(): Observable<Hotel[]> {
    return of(MOCK_HOTELS.filter(h => h.providerId === 'hp1').concat(MOCK_HOTELS.slice(0, 2))).pipe(delay(400));
  }

  /** TODO: POST /api/hotel-provider/properties */
  createProperty(data: Partial<Hotel>): Observable<Hotel> {
    return of({ id: `h${Date.now()}`, ...data } as Hotel).pipe(delay(600));
  }

  /** TODO: GET /api/hotel-provider/rooms?hotelId= */
  getRooms(hotelId?: string): Observable<HotelRoom[]> {
    const rooms = hotelId ? MOCK_HOTEL_ROOMS.filter(r => r.hotelId === hotelId) : [...MOCK_HOTEL_ROOMS];
    return of(rooms).pipe(delay(400));
  }

  /** TODO: POST /api/hotel-provider/rooms */
  createRoom(data: Partial<HotelRoom>): Observable<HotelRoom> {
    return of({ id: `r${Date.now()}`, ...data } as HotelRoom).pipe(delay(600));
  }

  /** TODO: GET /api/hotel-provider/bookings */
  getBookings(): Observable<HotelBooking[]> {
    return of([...MOCK_HOTEL_BOOKINGS]).pipe(delay(400));
  }

  /** TODO: GET /api/hotel-provider/reviews */
  getReviews(): Observable<HotelReview[]> {
    return of([...MOCK_HOTEL_REVIEWS]).pipe(delay(400));
  }

  /** TODO: GET /api/hotel-provider/reports */
  getReports(): Observable<{ month: string; revenue: number; occupancy: number; bookings: number }[]> {
    return of([
      { month: 'Jan', revenue: 250000, occupancy: 72, bookings: 45 },
      { month: 'Feb', revenue: 320000, occupancy: 81, bookings: 58 },
      { month: 'Mar', revenue: 410000, occupancy: 88, bookings: 74 },
      { month: 'Apr', revenue: 380000, occupancy: 85, bookings: 69 },
      { month: 'May', revenue: 290000, occupancy: 68, bookings: 52 },
      { month: 'Jun', revenue: 340000, occupancy: 76, bookings: 61 },
    ]).pipe(delay(500));
  }
}
