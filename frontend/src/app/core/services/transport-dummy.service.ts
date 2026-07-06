import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Transport, TransportBooking } from '@app/core/models/transport.model';
import { MOCK_TRANSPORTS, MOCK_TRANSPORT_BOOKINGS } from '@app/core/data/mock-data';

@Injectable({ providedIn: 'root' })
export class TransportDummyService {
  /** TODO: GET /api/transports/search?route=&date= */
  searchTransport(route?: string, date?: string): Observable<Transport[]> {
    let results = [...MOCK_TRANSPORTS];
    if (route) {
      results = results.filter(t =>
        t.sourceCity.toLowerCase().includes(route.toLowerCase()) ||
        t.destinationCity.toLowerCase().includes(route.toLowerCase())
      );
    }
    return of(results).pipe(delay(600));
  }

  /** TODO: GET /api/transports */
  getAllTransports(): Observable<Transport[]> {
    return of([...MOCK_TRANSPORTS]).pipe(delay(400));
  }

  /** TODO: POST /api/transport-bookings */
  createBooking(tripId: string, transportId: string): Observable<TransportBooking> {
    const transport = MOCK_TRANSPORTS.find(t => t.id === transportId) ?? MOCK_TRANSPORTS[0];
    const booking: TransportBooking = {
      id: `tb${Date.now()}`,
      tripId,
      transportId,
      transportName: transport.name,
      transportType: transport.type,
      route: transport.route,
      departureTime: transport.departureTime,
      arrivalTime: transport.arrivalTime,
      passengerCount: 2,
      totalAmount: transport.pricePerSeat * 2,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    };
    return of(booking).pipe(delay(800));
  }

  /** TODO: POST /api/transport-bookings/{bookingId}/allocate-seats */
  allocateSeats(bookingId: string): Observable<TransportBooking> {
    const booking = MOCK_TRANSPORT_BOOKINGS.find(b => b.id === bookingId) ?? MOCK_TRANSPORT_BOOKINGS[0];
    return of({ ...booking, seatNumbers: ['5A', '5B'] }).pipe(delay(600));
  }

  /** TODO: GET /api/transport-bookings */
  getBookings(tripId?: string): Observable<TransportBooking[]> {
    const results = tripId
      ? MOCK_TRANSPORT_BOOKINGS.filter(b => b.tripId === tripId)
      : [...MOCK_TRANSPORT_BOOKINGS];
    return of(results).pipe(delay(400));
  }
}
