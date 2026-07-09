import { Component, OnInit, inject, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HotelsService } from '@app/core/hotels/hotels.service';
import { Hotel } from '@app/core/hotels/hotel.models';
import { AccommodationService } from '@app/features/trips/services/accommodation.service';
import { HotelBooking } from '@app/features/trips/services/accommodation.models';
import { Trip } from '@app/features/trips/services/trip.models';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { Destination } from '@app/core/destinations/destination.models';

@Component({
  selector: 'app-trip-accommodation-tab',
  imports: [
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmBadgeImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSelectImports,
  ],
  templateUrl: './trip-accommodation-tab.html',
})
export class TripAccommodationTab implements OnInit {
  public readonly trip = input.required<Trip>();

  private readonly hotelsService = inject(HotelsService);
  private readonly accommodationService = inject(AccommodationService);
  private readonly destinationsService = inject(DestinationsService);

  protected readonly hotels = signal<Hotel[]>([]);
  protected readonly searching = signal(true);
  protected readonly searchError = signal<string | null>(null);
  protected readonly tripBookings = signal<HotelBooking[]>([]);
  protected readonly destinations = signal<Destination[]>([]);
  protected readonly destinationsLoading = signal(true);
  protected readonly selectedDestinationId = signal(0);

  ngOnInit(): void {
    const trip = this.trip();
    this.selectedDestinationId.set(trip.destinationId);
    this.runSearch(trip.destinationId);

    this.destinationsService.listDestinations().subscribe({
      next: (destinations) => {
        this.destinations.set(destinations);
        this.destinationsLoading.set(false);
      },
      error: () => this.destinationsLoading.set(false),
    });

    this.accommodationService.getAccommodationSummary(trip.tripId).subscribe({
      next: (summary) => this.tripBookings.set(summary.bookings),
      error: () => {
        // "Already booked" list just stays empty.
      },
    });
  }

  protected onDestinationChange(value: string | null | undefined): void {
    if (value) {
      this.selectedDestinationId.set(Number(value));
    }
  }

  protected destinationLabel(destination: Destination): string {
    return `${destination.destinationName}, ${destination.state}`;
  }

  protected readonly destinationIdToLabel = (id: string): string => {
    const destination = this.destinations().find((d) => String(d.destinationId) === id);
    return destination ? this.destinationLabel(destination) : id;
  };

  protected onSearch(query: string): void {
    this.runSearch(this.selectedDestinationId(), query);
  }

  private runSearch(destinationId: number, query?: string): void {
    this.searching.set(true);
    this.searchError.set(null);
    this.hotelsService.searchHotels(destinationId, query || undefined).subscribe({
      next: (hotels) => {
        this.hotels.set(hotels);
        this.searching.set(false);
      },
      error: () => {
        this.searchError.set('Something went wrong searching hotels. Please try again.');
        this.searching.set(false);
      },
    });
  }
}
