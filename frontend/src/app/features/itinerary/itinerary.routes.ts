import { Routes } from '@angular/router';
import { CreateItinerary } from './components/create-itinerary/create-itinerary';
import { ItineraryList } from './components/itinerary-list/itinerary-list';
import { ItineraryDetails } from './components/itinerary-details/itinerary-details';
import { EditItinerary } from './components/edit-itinerary/edit-itinerary';

export const ITINERARY_ROUTES: Routes = [
  { path: '', component: ItineraryList },
  { path: 'create', component: CreateItinerary },
  { path: 'details/:id', component: ItineraryDetails },
  { path: 'edit/:id', component: EditItinerary }
];