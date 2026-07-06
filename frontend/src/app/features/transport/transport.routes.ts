import { Routes } from '@angular/router';
import { TransportList } from './components/transport-list/transport-list';
import { TransportBooking } from './components/transport-booking/transport-booking';
import { SeatAllocation } from './components/seat-allocation/seat-allocation';

export const TRANSPORT_ROUTES: Routes = [
  { path: '', component: TransportList },
  { path: 'book/:id', component: TransportBooking },
  { path: 'seats/:id', component: SeatAllocation }
];