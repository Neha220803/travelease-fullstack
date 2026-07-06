import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TransportService {
  private api = inject(ApiService);

  getBuses(): Observable<any> {
    return this.api.get<any>('/api/buses');
  }

  getBookings(): Observable<any> {
    return this.api.get<any>('/api/bookings');
  }

  getFares(): Observable<any> {
    return this.api.get<any>('/api/fares');
  }

  getSeats(): Observable<any> {
    return this.api.get<any>('/api/seats');
  }
}
