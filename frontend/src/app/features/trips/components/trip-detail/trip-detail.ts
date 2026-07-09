import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { DestinationPill } from '@app/shared/ui/destination-pill/destination-pill';
import { TripsService } from '@app/features/trips/services/trips.service';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { Trip, TripMember } from '@app/features/trips/services/trip.models';
import { TripOverviewTab } from './tabs/trip-overview-tab/trip-overview-tab';
import { TripMembersTab } from './tabs/trip-members-tab/trip-members-tab';
import { TripTravelTab } from './tabs/trip-travel-tab/trip-travel-tab';
import { TripAccommodationTab } from './tabs/trip-accommodation-tab/trip-accommodation-tab';
import { TripExpensesTab } from './tabs/trip-expenses-tab/trip-expenses-tab';
import { TripItineraryTab } from './tabs/trip-itinerary-tab/trip-itinerary-tab';
import { TripAlertsTab } from './tabs/trip-alerts-tab/trip-alerts-tab';
import { TripReviewsTab } from './tabs/trip-reviews-tab/trip-reviews-tab';

const TRAVELER_CATEGORY_LABELS: Record<number, string> = {
  1: 'Solo',
  2: 'Couple',
  3: 'Family',
  4: 'Friends',
  5: 'Corporate',
};

interface TabInfo {
  id: string;
  label: string;
}

const TABS: TabInfo[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'members', label: 'Members' },
  { id: 'travel', label: 'Travel' },
  { id: 'accommodation', label: 'Accommodation' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'reviews', label: 'Reviews' },
];

const VALID_TAB_IDS = new Set(TABS.map((t) => t.id));

@Component({
  selector: 'app-trip-detail',
  imports: [
    RouterLink,
    NgIcon,
    HlmButtonImports,
    HlmBadgeImports,
    HlmTabsImports,
    StatusBadge,
    DestinationPill,
    TripOverviewTab,
    TripMembersTab,
    TripTravelTab,
    TripAccommodationTab,
    TripExpensesTab,
    TripItineraryTab,
    TripAlertsTab,
    TripReviewsTab,
  ],
  templateUrl: './trip-detail.html',
})
export class TripDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly tripsService = inject(TripsService);
  private readonly destinationsService = inject(DestinationsService);

  protected readonly tabs = TABS;

  private readonly initialTabParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('tab'))),
    { initialValue: null },
  );

  protected readonly activeTab = signal(
    this.initialTabParam() && VALID_TAB_IDS.has(this.initialTabParam()!)
      ? this.initialTabParam()!
      : 'overview',
  );

  private readonly tripId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('tripId') ?? '')),
    { initialValue: '' },
  );

  public readonly trip = signal<Trip | null>(null);
  protected readonly members = signal<TripMember[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly destinationNames = signal<Map<number, string>>(new Map());

  protected readonly categoryLabel = computed(() => {
    const trip = this.trip();
    return trip ? (TRAVELER_CATEGORY_LABELS[trip.categoryId] ?? 'Trip') : '';
  });

  constructor() {
    this.tripsService.getTripById(this.tripId()).subscribe({
      next: (trip) => {
        this.trip.set(trip);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Something went wrong loading this trip. Please try again.');
        this.loading.set(false);
      },
    });

    this.tripsService.getTripMembers(this.tripId()).subscribe({
      next: (members) => this.members.set(members),
      error: () => {
        // Member count is a hero enhancement, not required to view the trip.
      },
    });

    this.destinationsService.listDestinations().subscribe({
      next: (destinations) => {
        this.destinationNames.set(new Map(destinations.map((d) => [d.destinationId, d.destinationName])));
      },
      error: () => {
        // Same fallback approach as trip-list.ts — falls back to "Destination #<id>".
      },
    });
  }

  protected destinationLabel(destinationId: number): string {
    return this.destinationNames().get(destinationId) ?? `Destination #${destinationId}`;
  }
}
