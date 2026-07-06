import { Routes } from '@angular/router';
import { Recommendations } from './components/recommendations/recommendations';
import { Activities } from './components/activities/activities';
import { Attractions } from './components/attractions/attractions';
import { RecommendedHotels } from './components/recommended-hotels/recommended-hotels';

export const RECOMMENDATIONS_ROUTES: Routes = [
  { path: '', component: Recommendations },
  { path: 'activities', component: Activities },
  { path: 'attractions', component: Attractions },
  { path: 'hotels', component: RecommendedHotels }
];