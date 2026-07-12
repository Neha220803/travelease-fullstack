import { Component, input, linkedSignal, output } from '@angular/core';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { toIsoDate } from '@app/core/dates/date-utils';

@Component({
  selector: 'app-bus-search-form',
  imports: [HlmInputImports, HlmLabelImports, HlmButtonImports, HlmDatePickerImports, HlmCardImports],
  templateUrl: './bus-search-form.html',
})
export class BusSearchForm {
  public readonly initialSource = input.required<string>();
  public readonly initialDestination = input.required<string>();
  public readonly initialDate = input<Date | undefined>(undefined);

  public readonly search = output<{ source: string; destination: string; date: string }>();

  protected readonly source = linkedSignal(this.initialSource);
  protected readonly destination = linkedSignal(this.initialDestination);
  protected readonly date = linkedSignal(this.initialDate);

  protected onSourceInput(value: string): void {
    this.source.set(value);
  }

  protected onDestinationInput(value: string): void {
    this.destination.set(value);
  }

  protected onDateChange(date: Date | undefined): void {
    this.date.set(date);
  }

  protected onSearchClick(): void {
    const d = this.date();
    this.search.emit({ source: this.source(), destination: this.destination(), date: d ? toIsoDate(d) : '' });
  }
}
