import { Component, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { HlmAutocompleteImports } from '@spartan-ng/helm/autocomplete';
import { UsersService } from '@app/core/users/users.service';
import { TravelerSearchResult } from '@app/core/users/user-search.model';

const MIN_QUERY_LENGTH = 2;

@Component({
  selector: 'app-traveler-picker',
  imports: [HlmAutocompleteImports],
  templateUrl: './traveler-picker.html',
})
export class TravelerPicker {
  private readonly usersService = inject(UsersService);

  public readonly inputId = input.required<string>();
  public readonly excludeIds = input<string[]>([]);
  public readonly selected = output<TravelerSearchResult>();

  protected readonly query = signal('');
  protected readonly searching = signal(false);
  protected readonly rawResults = signal<TravelerSearchResult[]>([]);
  protected readonly pickedValue = signal<TravelerSearchResult | null>(null);

  protected readonly results = computed(() =>
    this.rawResults().filter((r) => !this.excludeIds().includes(r.id)),
  );

  protected readonly itemToString = (traveler: TravelerSearchResult): string =>
    `${traveler.name} (${traveler.email})`;

  protected readonly isSameTraveler = (
    item: TravelerSearchResult,
    selected: TravelerSearchResult | null | undefined,
  ): boolean => item.id === selected?.id;

  constructor() {
    toObservable(this.query)
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          const trimmed = query.trim();
          if (trimmed.length < MIN_QUERY_LENGTH) {
            this.searching.set(false);
            return of<TravelerSearchResult[]>([]);
          }
          this.searching.set(true);
          return this.usersService
            .searchTravelers(trimmed)
            .pipe(catchError(() => of<TravelerSearchResult[]>([])));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.searching.set(false);
        this.rawResults.set(results);
      });
  }

  protected onValueChange(value: TravelerSearchResult | null | undefined): void {
    if (!value) {
      return;
    }
    this.selected.emit(value);
    this.pickedValue.set(null);
    this.query.set('');
    this.rawResults.set([]);
  }
}
