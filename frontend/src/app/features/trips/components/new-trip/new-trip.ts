import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIcon } from '@ng-icons/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { TripsService } from '@app/features/trips/services/trips.service';
import { CreateTripPayload } from '@app/features/trips/services/trip.models';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { Destination } from '@app/core/destinations/destination.models';
import { TravelerPicker } from '@app/features/trips/components/traveler-picker/traveler-picker';
import { TravelerSearchResult } from '@app/core/users/user-search.model';
import { ToastService } from '@app/shared/ui/toast/toast.service';
import { fromIsoDate, toIsoDate } from '@app/core/dates/date-utils';

type DialogStep = 'prompt' | 'picker';

// A light autocomplete assist for the free-text Source Location field: major
// Indian cities travelers commonly depart from, merged with the destination
// catalog's own cities so a destination can also be picked as a source (e.g.
// a multi-city trip starting from one catalog city to another).
const COMMON_SOURCE_CITIES = [
  'Bengaluru',
  'Mumbai',
  'Delhi',
  'Chennai',
  'Hyderabad',
  'Kolkata',
  'Pune',
  'Ahmedabad',
  'Kochi',
  'Coimbatore',
  'Visakhapatnam',
  'Jaipur',
  'Lucknow',
  'Chandigarh',
];

@Component({
  selector: 'app-new-trip',
  imports: [
    RouterLink,
    NgIcon,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
    HlmDatePickerImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSelectImports,
    PageHeader,
    TravelerPicker,
  ],
  templateUrl: './new-trip.html',
})
export class NewTrip {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly tripsService = inject(TripsService);
  private readonly destinationsService = inject(DestinationsService);
  private readonly toastService = inject(ToastService);

  // Present (non-null) whenever this page was opened as /trips/:tripId/edit,
  // in which case the form behaves as an editor for that trip instead of a
  // blank creation form.
  protected readonly editingTripId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('tripId'))),
    { initialValue: null },
  );
  protected readonly isEditMode = computed(() => this.editingTripId() !== null);

  protected readonly loadingTrip = signal(false);
  protected readonly loadError = signal<string | null>(null);

  // Prefill values for the plain (template-ref-based) text inputs below. These
  // are only read once, when the edit-mode fetch resolves, so they never
  // fight with what the traveler is actively typing (see the [attr.value]
  // bindings in new-trip.html).
  protected readonly prefillName = signal('');
  protected readonly prefillBudget = signal('');

  protected readonly source = signal('');
  protected readonly startDate = signal<Date | undefined>(undefined);
  protected readonly endDate = signal<Date | undefined>(undefined);

  // Blocks past dates in both the start/end calendars: a trip can't be
  // planned to start before today, and can't end before it starts.
  protected readonly todayStartOfDay = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  protected readonly minStartDate = computed(() => this.todayStartOfDay);
  protected readonly minEndDate = computed(() => this.startDate() ?? this.todayStartOfDay);

  protected readonly tripTypes = ['Solo', 'Couple', 'Family', 'Friends', 'Corporate'];
  protected readonly tripType = signal('Friends');
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly destinations = signal<Destination[]>([]);
  protected readonly destinationsLoading = signal(true);
  protected readonly destinationsError = signal(false);
  protected readonly selectedDestinationId = signal('');

  protected readonly dialogState = signal<'open' | 'closed'>('closed');
  protected readonly dialogStep = signal<DialogStep>('prompt');
  protected readonly createdTripId = signal<string | null>(null);
  protected readonly invitedTravelers = signal<TravelerSearchResult[]>([]);
  protected readonly memberInviteError = signal<string | null>(null);

  protected readonly excludeIds = computed(() => this.invitedTravelers().map((t) => t.id));

  // Merges the destination catalog's cities into the common-cities list so
  // the datalist suggests real places either way, deduped and sorted.
  protected readonly sourceSuggestions = computed(() => {
    const catalogCities = this.destinations().map((d) => d.destinationName);
    return Array.from(new Set([...COMMON_SOURCE_CITIES, ...catalogCities])).sort();
  });

  constructor() {
    this.destinationsService.listDestinations().subscribe({
      next: (destinations) => {
        this.destinations.set(destinations);
        this.destinationsLoading.set(false);
        if (!this.isEditMode() && destinations.length > 0) {
          this.selectedDestinationId.set(String(destinations[0].destinationId));
        }
      },
      error: () => {
        this.destinationsError.set(true);
        this.destinationsLoading.set(false);
      },
    });

    const tripId = this.editingTripId();
    if (tripId) {
      this.loadingTrip.set(true);
      this.tripsService.getTripById(tripId).subscribe({
        next: (trip) => {
          this.prefillName.set(trip.tripName);
          this.prefillBudget.set(String(trip.budgetAmount));
          this.source.set(trip.sourceLocation);
          this.startDate.set(fromIsoDate(trip.startDate));
          this.endDate.set(fromIsoDate(trip.endDate));
          this.selectedDestinationId.set(String(trip.destinationId));
          this.tripType.set(this.tripTypes[trip.categoryId - 1] ?? 'Friends');
          this.loadingTrip.set(false);
        },
        error: () => {
          this.loadError.set('Something went wrong loading this trip. Please try again.');
          this.loadingTrip.set(false);
        },
      });
    }
  }

  protected onSourceInput(value: string): void {
    this.source.set(value);
  }

  protected onStartDateChange(date: Date | undefined): void {
    this.startDate.set(date);
    // If the trip already had an end date earlier than the newly picked
    // start date, clear it rather than silently submitting an invalid range.
    const end = this.endDate();
    if (date && end && end < date) {
      this.endDate.set(undefined);
    }
  }

  protected onEndDateChange(date: Date | undefined): void {
    this.endDate.set(date);
  }

  protected onTripTypeChange(value: string | null | undefined): void {
    if (value) {
      this.tripType.set(value);
    }
  }

  protected onDestinationChange(value: string | null | undefined): void {
    if (value) {
      this.selectedDestinationId.set(value);
    }
  }

  protected destinationLabel(destination: Destination): string {
    return `${destination.destinationName}, ${destination.state}`;
  }

  protected readonly destinationIdToLabel = (id: string): string => {
    const destination = this.destinations().find((d) => String(d.destinationId) === id);
    return destination ? this.destinationLabel(destination) : id;
  };

  protected onSubmit(event: Event, name: string, budget: string): void {
    event.preventDefault();
    this.error.set(null);

    if (!this.selectedDestinationId()) {
      this.error.set('Please select a destination.');
      return;
    }

    const source = this.source().trim();
    if (!source) {
      this.error.set('Please enter a source location.');
      return;
    }

    const destination = this.destinations().find((d) => String(d.destinationId) === this.selectedDestinationId());
    if (destination && source.toLowerCase() === destination.destinationName.toLowerCase()) {
      this.error.set('Source and destination can\'t be the same location.');
      return;
    }

    const startDate = this.startDate();
    const endDate = this.endDate();
    if (!startDate || !endDate) {
      this.error.set('Please pick both a start and end date.');
      return;
    }
    if (startDate < this.todayStartOfDay) {
      this.error.set('Start date can\'t be in the past.');
      return;
    }
    if (endDate < startDate) {
      this.error.set('End date can\'t be before the start date.');
      return;
    }

    const categoryId = this.tripTypes.indexOf(this.tripType()) + 1;
    const payload: CreateTripPayload = {
      tripName: name,
      sourceLocation: source,
      destinationId: Number(this.selectedDestinationId()),
      budgetAmount: Number(budget),
      categoryId,
      startDate: toIsoDate(startDate),
      endDate: toIsoDate(endDate),
    };

    this.submitting.set(true);

    const tripId = this.editingTripId();
    if (tripId) {
      this.tripsService.updateTrip(tripId, payload).subscribe({
        next: () => {
          this.submitting.set(false);
          this.toastService.showSuccess('Trip updated successfully');
          this.router.navigate(['/trips', tripId], { queryParams: { tab: 'overview' } });
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.error.set(this.extractErrorMessage(err, 'updating'));
        },
      });
      return;
    }

    this.tripsService.createTrip(payload).subscribe({
      next: (trip) => {
        this.submitting.set(false);
        this.toastService.showSuccess('Trip created successfully');
        this.createdTripId.set(trip.tripId);
        this.invitedTravelers.set([]);
        this.memberInviteError.set(null);
        this.dialogStep.set('prompt');
        this.dialogState.set('open');
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.error.set(this.extractErrorMessage(err, 'creating'));
      },
    });
  }

  protected onAddMembers(): void {
    this.dialogStep.set('picker');
  }

  protected onCloseDialog(): void {
    this.dialogState.set('closed');
  }

  protected onMemberPicked(traveler: TravelerSearchResult): void {
    const tripId = this.createdTripId();
    if (!tripId) {
      return;
    }
    this.memberInviteError.set(null);
    this.tripsService.inviteMember(tripId, traveler.email).subscribe({
      next: () => {
        this.invitedTravelers.update((list) => [...list, traveler]);
      },
      error: () => {
        this.memberInviteError.set('Could not send the invite. They may already be invited.');
      },
    });
  }

  protected onDialogClosed(): void {
    const tripId = this.createdTripId();
    if (!tripId) {
      return;
    }
    const tab = this.invitedTravelers().length > 0 ? 'members' : 'overview';
    this.router.navigate(['/trips', tripId], { queryParams: { tab } });
  }

  private extractErrorMessage(err: unknown, action: 'creating' | 'updating' = 'creating'): string {
    if (err instanceof HttpErrorResponse) {
      const apiError = err.error?.error;
      if (apiError) {
        const details: string[] = apiError.details ?? [];
        return details.length > 0 ? `${apiError.message}\n${details.join('\n')}` : apiError.message;
      }
    }
    return `Something went wrong ${action} your trip. Please try again.`;
  }
}
