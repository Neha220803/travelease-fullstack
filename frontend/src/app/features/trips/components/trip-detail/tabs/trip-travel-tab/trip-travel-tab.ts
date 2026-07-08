import { Component, OnInit, inject, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker';
import { ScheduleService } from '@app/features/trips/services/schedule.service';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { BusSearchResult, TripBusBooking } from '@app/features/trips/services/schedule.models';
import { Trip, TripMember } from '@app/features/trips/services/trip.models';
import { fromIsoDate, toIsoDate } from '@app/core/dates/date-utils';

interface SeatInfo {
  index: number;
  booked: boolean;
  selected: boolean;
  recommended: boolean;
}

const BOOKED_SEATS = [2, 5, 7, 11, 14, 18, 22, 25];
const SELECTED_SEATS = [12, 13, 17, 19];
const RECOMMENDED_SEATS = [12, 13, 17, 19, 8, 9];
const SELECTED_SEAT_LABELS = ['13', '14', '18', '20'];

const SEATS: SeatInfo[] = Array.from({ length: 30 }, (_, i) => ({
  index: i,
  booked: BOOKED_SEATS.includes(i),
  selected: SELECTED_SEATS.includes(i),
  recommended: RECOMMENDED_SEATS.includes(i),
}));

@Component({
  selector: 'app-trip-travel-tab',
  imports: [
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmBadgeImports,
    HlmInputImports,
    HlmLabelImports,
    HlmDatePickerImports,
  ],
  templateUrl: './trip-travel-tab.html',
})
export class TripTravelTab implements OnInit {
  public readonly trip = input.required<Trip>();
  public readonly members = input.required<TripMember[]>();

  private readonly scheduleService = inject(ScheduleService);
  private readonly destinationsService = inject(DestinationsService);

  protected readonly destinationName = signal('');
  protected readonly results = signal<BusSearchResult[]>([]);
  protected readonly searching = signal(true);
  protected readonly searchError = signal<string | null>(null);
  protected readonly tripBookings = signal<TripBusBooking[]>([]);
  protected readonly searchDate = signal<Date | undefined>(undefined);

  public readonly seats = SEATS;
  protected readonly selectedSeatLabels = SELECTED_SEAT_LABELS;

  ngOnInit(): void {
    const trip = this.trip();
    this.searchDate.set(fromIsoDate(trip.startDate));

    this.destinationsService.listDestinations().subscribe({
      next: (destinations) => {
        const match = destinations.find((d) => d.destinationId === trip.destinationId);
        const name = match?.destinationName ?? '';
        this.destinationName.set(name);
        this.runSearch(trip.sourceLocation, name, trip.startDate);
      },
      error: () => this.searching.set(false),
    });

    this.scheduleService.getTripBusBookings(trip.tripId).subscribe({
      next: (summary) => this.tripBookings.set(summary.bookings),
      error: () => {
        // "Already booked" list just stays empty.
      },
    });
  }

  protected onDateChange(date: Date | undefined): void {
    this.searchDate.set(date);
  }

  protected onSearch(source: string, destination: string): void {
    const date = this.searchDate();
    this.runSearch(source, destination, date ? toIsoDate(date) : '');
  }

  protected suitableForGroup(bus: BusSearchResult): boolean {
    return bus.availableSeats >= this.members().length;
  }

  private runSearch(source: string, destination: string, date: string): void {
    if (!source || !destination || !date) {
      this.searching.set(false);
      return;
    }
    this.searching.set(true);
    this.searchError.set(null);
    this.scheduleService.searchBuses(source, destination, date).subscribe({
      next: (results) => {
        this.results.set(results);
        this.searching.set(false);
      },
      error: () => {
        this.searchError.set('Something went wrong searching buses. Please try again.');
        this.searching.set(false);
      },
    });
  }
}
