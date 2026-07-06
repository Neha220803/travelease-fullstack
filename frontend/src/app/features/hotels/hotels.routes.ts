import { Routes } from '@angular/router';
import { HotelList } from './components/hotel-list/hotel-list';
import { HotelDetails } from './components/hotel-details/hotel-details';
import { HotelBooking } from './components/hotel-booking/hotel-booking';
import { RoomAllocation } from './components/room-allocation/room-allocation';

export const HOTELS_ROUTES: Routes = [
  { path: '', component: HotelList },
  { path: 'details/:id', component: HotelDetails },
  { path: 'book/:id', component: HotelBooking },
  { path: 'rooms', component: RoomAllocation }
];