import { Routes } from '@angular/router';

export const routes: Routes = [
  { 
    path: 'auth', 
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES) 
  },
  { 
    path: 'trips', 
    loadChildren: () => import('./features/trips/trips.routes').then(m => m.TRIPS_ROUTES) 
  },
  { 
    path: 'hotels', 
    loadChildren: () => import('./features/hotels/hotels.routes').then(m => m.HOTELS_ROUTES) 
  },
  { 
    path: 'transport', 
    loadChildren: () => import('./features/transport/transport.routes').then(m => m.TRANSPORT_ROUTES) 
  },
  { 
    path: 'itinerary', 
    loadChildren: () => import('./features/itinerary/itinerary.routes').then(m => m.ITINERARY_ROUTES) 
  },
  { 
    path: 'budget', 
    loadChildren: () => import('./features/budget/budget.routes').then(m => m.BUDGET_ROUTES) 
  },
  { 
    path: 'recommendations', 
    loadChildren: () => import('./features/recommendations/recommendations.routes').then(m => m.RECOMMENDATIONS_ROUTES) 
  },
  { 
    path: 'notifications', 
    loadChildren: () => import('./features/notifications/notifications.routes').then(m => m.NOTIFICATIONS_ROUTES) 
  },
  { 
    path: 'delay', 
    loadChildren: () => import('./features/delay-analysis/delay-analysis.routes').then(m => m.DELAY_ROUTES) 
  },
  { 
    path: 'admin', 
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES) 
  },
  { path: '', redirectTo: 'auth', pathMatch: 'full' }
];
