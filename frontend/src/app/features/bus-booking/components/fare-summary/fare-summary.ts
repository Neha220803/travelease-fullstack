import { Component, input } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { FareBreakdownResponse } from '@app/features/bus-booking/services/schedule.models';

@Component({
  selector: 'app-fare-summary',
  imports: [HlmCardImports],
  templateUrl: './fare-summary.html',
})
export class FareSummary {
  public readonly breakdown = input<FareBreakdownResponse | null>(null);
}
