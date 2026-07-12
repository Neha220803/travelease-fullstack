import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { toIsoDate } from '@app/core/dates/date-utils';
import { RouteReferenceService } from '@app/features/transport/services/route-reference.service';
import { RouteReferenceResponse } from '@app/features/transport/services/route-reference.models';

@Component({
  selector: 'app-bus-search-form',
  imports: [
    HlmInputImports,
    HlmLabelImports,
    HlmButtonImports,
    HlmDatePickerImports,
    HlmCardImports,
    HlmSelectImports,
  ],
  templateUrl: './bus-search-form.html',
})
export class BusSearchForm {
  public readonly initialSource = input.required<string>();
  public readonly initialDestination = input.required<string>();
  public readonly initialDate = input<Date | undefined>(undefined);

  public readonly search = output<{ source: string; destination: string; date: string }>();

  private readonly routeReferenceService = inject(RouteReferenceService);

  protected readonly routes = signal<RouteReferenceResponse[]>([]);
  protected readonly routesLoading = signal(true);
  protected readonly routesError = signal(false);

  protected readonly source = linkedSignal(this.initialSource);
  public readonly destination = linkedSignal(this.initialDestination);
  protected readonly date = linkedSignal(this.initialDate);
  protected readonly today = new Date();

  // Every source a seeded route actually departs from.
  protected readonly sources = computed(() => {
    const unique = new Set(this.routes().map((r) => r.source));
    return Array.from(unique).sort();
  });

  // Destinations filtered to routes that actually exist from the selected
  // source, rather than every destination in the system - so a traveler can
  // never pick a source/destination pair with no possible route.
  public readonly destinations = computed(() => {
    const src = this.source();
    const unique = new Set(
      this.routes()
        .filter((r) => r.source === src)
        .map((r) => r.destination),
    );
    return Array.from(unique).sort();
  });

  protected readonly canSearch = computed(() => !!this.source() && !!this.destination() && !!this.date());

  constructor() {
    this.routeReferenceService.listActiveRoutes().subscribe({
      next: (routes) => {
        this.routes.set(routes);
        this.routesLoading.set(false);
      },
      error: () => {
        this.routesError.set(true);
        this.routesLoading.set(false);
      },
    });
  }

  public onSourceChange(value: string | null | undefined): void {
    if (!value) return;
    this.source.set(value);
    // The previously-selected destination may not be reachable from the new
    // source - clear it rather than silently searching a route that doesn't exist.
    if (this.destination() && !this.destinations().includes(this.destination())) {
      this.destination.set('');
    }
  }

  public onDestinationChange(value: string | null | undefined): void {
    if (value) {
      this.destination.set(value);
    }
  }

  protected onDateChange(date: Date | undefined): void {
    this.date.set(date);
  }

  protected onSearchClick(): void {
    if (!this.canSearch()) return;
    const d = this.date();
    this.search.emit({ source: this.source(), destination: this.destination(), date: d ? toIsoDate(d) : '' });
  }
}
