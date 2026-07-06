import { Routes } from '@angular/router';
import { ReportDelay } from './components/report-delay/report-delay';
import { DelayImpact } from './components/delay-impact/delay-impact';
import { Reschedule } from './components/reschedule/reschedule';

export const DELAY_ROUTES: Routes = [
  { path: 'report', component: ReportDelay },
  { path: 'impact', component: DelayImpact },
  { path: 'reschedule', component: Reschedule },
  { path: '', redirectTo: 'report', pathMatch: 'full' }
];