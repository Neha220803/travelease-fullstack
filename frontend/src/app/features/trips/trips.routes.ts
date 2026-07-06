import { Routes } from '@angular/router';
import { CreateTrip } from './components/create-trip/create-trip';
import { EditTrip } from './components/edit-trip/edit-trip';
import { TripList } from './components/trip-list/trip-list';
import { TripDetails } from './components/trip-details/trip-details';
import { InviteMembers } from './components/invite-members/invite-members';

export const TRIPS_ROUTES: Routes = [
  { path: '', component: TripList },
  { path: 'create', component: CreateTrip },
  { path: 'edit/:id', component: EditTrip },
  { path: 'details/:id', component: TripDetails },
  { path: 'invite/:id', component: InviteMembers }
];