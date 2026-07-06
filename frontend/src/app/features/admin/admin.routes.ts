import { Routes } from '@angular/router';
import { Dashboard } from './components/dashboard/dashboard';
import { ManageUsers } from './components/manage-users/manage-users';
import { ManageHotels } from './components/manage-hotels/manage-hotels';
import { ManageTransport } from './components/manage-transport/manage-transport';
import { ManageAttractions } from './components/manage-attractions/manage-attractions';
import { ManageActivities } from './components/manage-activities/manage-activities';

export const ADMIN_ROUTES: Routes = [
  { path: '', component: Dashboard },
  { path: 'users', component: ManageUsers },
  { path: 'hotels', component: ManageHotels },
  { path: 'transport', component: ManageTransport },
  { path: 'attractions', component: ManageAttractions },
  { path: 'activities', component: ManageActivities }
];