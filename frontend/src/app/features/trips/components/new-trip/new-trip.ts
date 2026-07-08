import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIcon } from '@ng-icons/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
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

type DialogStep = 'prompt' | 'picker';

@Component({
  selector: 'app-new-trip',
  imports: [
    RouterLink,
    NgIcon,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
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
  private readonly tripsService = inject(TripsService);
  private readonly destinationsService = inject(DestinationsService);

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

  constructor() {
    this.destinationsService.listDestinations().subscribe({
      next: (destinations) => {
        this.destinations.set(destinations);
        this.destinationsLoading.set(false);
        if (destinations.length > 0) {
          this.selectedDestinationId.set(String(destinations[0].destinationId));
        }
      },
      error: () => {
        this.destinationsError.set(true);
        this.destinationsLoading.set(false);
      },
    });
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

  protected onSubmit(
    event: Event,
    name: string,
    budget: string,
    source: string,
    startDate: string,
    endDate: string,
  ): void {
    event.preventDefault();
    this.error.set(null);

    if (!this.selectedDestinationId()) {
      this.error.set('Please select a destination.');
      return;
    }

    const categoryId = this.tripTypes.indexOf(this.tripType()) + 1;
    const payload: CreateTripPayload = {
      tripName: name,
      sourceLocation: source,
      destinationId: Number(this.selectedDestinationId()),
      budgetAmount: Number(budget),
      categoryId,
      startDate,
      endDate,
    };

    this.submitting.set(true);
    this.tripsService.createTrip(payload).subscribe({
      next: (trip) => {
        this.submitting.set(false);
        this.createdTripId.set(trip.tripId);
        this.invitedTravelers.set([]);
        this.memberInviteError.set(null);
        this.dialogStep.set('prompt');
        this.dialogState.set('open');
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.error.set(this.extractErrorMessage(err));
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

  private extractErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const apiError = err.error?.error;
      if (apiError) {
        const details: string[] = apiError.details ?? [];
        return details.length > 0 ? `${apiError.message}\n${details.join('\n')}` : apiError.message;
      }
    }
    return 'Something went wrong creating your trip. Please try again.';
  }
}
