import { Routes } from '@angular/router';
import { NotificationList } from './components/notification-list/notification-list';
import { NotificationDetails } from './components/notification-details/notification-details';

export const NOTIFICATIONS_ROUTES: Routes = [
  { path: '', component: NotificationList },
  { path: 'details/:id', component: NotificationDetails }
];