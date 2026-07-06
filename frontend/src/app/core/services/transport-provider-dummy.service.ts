import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Vehicle, Transport, TransportBooking, TransportRoute } from '@app/core/models/transport.model';
import { MOCK_VEHICLES, MOCK_TRANSPORTS, MOCK_TRANSPORT_BOOKINGS, MOCK_TRANSPORT_ROUTES } from '@app/core/data/mock-data';

@Injectable({ providedIn: 'root' })
export class TransportProviderDummyService {
  /** TODO: GET /api/transport-provider/vehicles */
  getVehicles(): Observable<Vehicle[]> {
    return of([...MOCK_VEHICLES]).pipe(delay(400));
  }

  /** TODO: POST /api/transport-provider/vehicles */
  createVehicle(data: Partial<Vehicle>): Observable<Vehicle> {
    return of({ id: `v${Date.now()}`, ...data } as Vehicle).pipe(delay(600));
  }

  /** TODO: GET /api/transport-provider/routes */
  getRoutes(): Observable<TransportRoute[]> {
    return of([...MOCK_TRANSPORT_ROUTES]).pipe(delay(400));
  }

  /** TODO: GET /api/transport-provider/bookings */
  getBookings(): Observable<TransportBooking[]> {
    return of([...MOCK_TRANSPORT_BOOKINGS]).pipe(delay(400));
  }

  /** TODO: GET /api/transport-provider/reports */
  getReports(): Observable<{ month: string; revenue: number; passengers: number; utilization: number }[]> {
    return of([
      { month: 'Jan', revenue: 120000, passengers: 850, utilization: 68 },
      { month: 'Feb', revenue: 145000, passengers: 1020, utilization: 74 },
      { month: 'Mar', revenue: 180000, passengers: 1250, utilization: 82 },
      { month: 'Apr', revenue: 165000, passengers: 1140, utilization: 78 },
      { month: 'May', revenue: 130000, passengers: 910, utilization: 70 },
      { month: 'Jun', revenue: 155000, passengers: 1080, utilization: 75 },
    ]).pipe(delay(500));
  }
}
