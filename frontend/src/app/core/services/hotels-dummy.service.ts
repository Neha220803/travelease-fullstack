import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Hotel, HotelBooking } from '@app/core/models/hotel.model';
import { MOCK_HOTELS, MOCK_HOTEL_BOOKINGS } from '@app/core/data/mock-data';

@Injectable({ providedIn: 'root' })
export class HotelsDummyService {
  /** TODO: GET /api/hotels/search?destinationId=&checkIn=&checkOut= */
  searchHotels(destinationId: string, checkIn: string, checkOut: string): Observable<Hotel[]> {
    const results = MOCK_HOTELS.filter(h => !destinationId || h.destinationId === destinationId);
    return of(results).pipe(delay(600));
  }

  /** TODO: GET /api/hotels/filter?budgetMax=&minRating=&amenities= */
  filterHotels(budgetMax?: number, minRating?: number): Observable<Hotel[]> {
    let results = [...MOCK_HOTELS];
    if (budgetMax) results = results.filter(h => h.pricePerNight <= budgetMax);
    if (minRating) results = results.filter(h => h.rating >= minRating);
    return of(results).pipe(delay(400));
  }

  /** TODO: GET /api/hotels */
  getAllHotels(): Observable<Hotel[]> {
    return of([...MOCK_HOTELS]).pipe(delay(400));
  }

  /** TODO: POST /api/hotel-bookings */
  createBooking(tripId: string, hotelId: string, checkIn: string, checkOut: string): Observable<HotelBooking> {
    const hotel = MOCK_HOTELS.find(h => h.id === hotelId) ?? MOCK_HOTELS[0];
    const booking: HotelBooking = {
      id: `hb${Date.now()}`,
      tripId,
      hotelId,
      hotelName: hotel.name,
      checkIn,
      checkOut,
      totalAmount: hotel.pricePerNight * 3,
      status: 'CONFIRMED',
      guestCount: 2,
      createdAt: new Date().toISOString(),
    };
    return of(booking).pipe(delay(800));
  }

  /** TODO: POST /api/hotel-bookings/{bookingId}/allocate-room */
  allocateRoom(bookingId: string): Observable<HotelBooking> {
    const booking = MOCK_HOTEL_BOOKINGS.find(b => b.id === bookingId) ?? MOCK_HOTEL_BOOKINGS[0];
    return of({ ...booking, roomType: 'FAMILY' }).pipe(delay(600));
  }

  /** TODO: GET /api/hotel-bookings (by trip or provider) */
  getBookings(tripId?: string): Observable<HotelBooking[]> {
    const results = tripId
      ? MOCK_HOTEL_BOOKINGS.filter(b => b.tripId === tripId)
      : [...MOCK_HOTEL_BOOKINGS];
    return of(results).pipe(delay(400));
  }
}
