import { Component, effect, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { TripsService } from '@app/features/trips/services/trips.service';
import { CreateTripPayload, Trip } from '@app/features/trips/services/trip.models';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { Destination } from '@app/core/destinations/destination.models';

const TRIP_TYPES = ['Solo', 'Couple', 'Family', 'Friends', 'Corporate'];

@Component({
  selector: 'app-edit-trip-dialog',
  imports: [HlmButtonImports, HlmInputImports, HlmLabelImports, HlmCardImports, HlmSelectImports],
  templateUrl: './edit-trip-dialog.html',
})
export class EditTripDialog {
  public readonly trip = input.required<Trip>();
  public readonly updated = output<Trip>();
  public readonly cancelled = output<void>();

  private readonly tripsService = inject(TripsService);
  private readonly destinationsService = inject(DestinationsService);

  protected readonly tripTypes = TRIP_TYPES;
  protected readonly tripName = signal('');
  protected readonly tripType = signal('Friends');
  protected readonly budget = signal('');
  protected readonly source = signal('');
  protected readonly startDate = signal('');
  protected readonly endDate = signal('');
  protected readonly selectedDestinationId = signal('');

  protected readonly destinations = signal<Destination[]>([]);
  protected readonly destinationsLoading = signal(true);
  protected readonly destinationsError = signal(false);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.destinationsService.listDestinations().subscribe({
      next: (destinations) => {
        this.destinations.set(destinations);
        this.destinationsLoading.set(false);
      },
      error: () => {
        this.destinationsError.set(true);
        this.destinationsLoading.set(false);
      },
    });

    // One-time-populate from the current trip, mirroring ModifyBookingDialog's
    // guarded effect so it doesn't fight the user's subsequent edits.
    let populated = false;
    effect(() => {
      if (populated) return;
      const trip = this.trip();
      populated = true;
      this.tripName.set(trip.tripName);
      this.tripType.set(TRIP_TYPES[trip.categoryId - 1] ?? 'Friends');
      this.budget.set(String(trip.budgetAmount));
      this.source.set(trip.sourceLocation);
      this.startDate.set(trip.startDate);
      this.endDate.set(trip.endDate);
      this.selectedDestinationId.set(String(trip.destinationId));
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

  protected submit(): void {
    this.error.set(null);
    if (!this.selectedDestinationId()) {
      this.error.set('Please select a destination.');
      return;
    }

    const payload: CreateTripPayload = {
      tripName: this.tripName(),
      sourceLocation: this.source(),
      destinationId: Number(this.selectedDestinationId()),
      budgetAmount: Number(this.budget()),
      categoryId: this.tripTypes.indexOf(this.tripType()) + 1,
      startDate: this.startDate(),
      endDate: this.endDate(),
    };

    this.submitting.set(true);
    this.tripsService.updateTrip(this.trip().tripId, payload).subscribe({
      next: (trip) => {
        this.submitting.set(false);
        this.updated.emit(trip);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.error.set(this.extractErrorMessage(err));
      },
    });
  }

  private extractErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const apiError = err.error?.error;
      if (apiError) {
        const details: string[] = apiError.details ?? [];
        return details.length > 0 ? `${apiError.message}\n${details.join('\n')}` : apiError.message;
      }
    }
    return 'Something went wrong updating this trip. Please try again.';
  }
}
