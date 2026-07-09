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
import {
  BusSearchResult,
  TripBusBooking,
  SeatLayoutResponse,
  SeatResponse,
  PassengerDetailDto,
} from '@app/features/trips/services/schedule.models';
import { Trip, TripMember } from '@app/features/trips/services/trip.models';
import { fromIsoDate, toIsoDate } from '@app/core/dates/date-utils';
import { ToastService } from '@app/shared/ui/toast/toast.service';

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
  private readonly toastService = inject(ToastService);

  protected readonly destinationName = signal('');
  protected readonly results = signal<BusSearchResult[]>([]);
  protected readonly searching = signal(true);
  protected readonly searchError = signal<string | null>(null);
  protected readonly tripBookings = signal<TripBusBooking[]>([]);
  protected readonly searchDate = signal<Date | undefined>(undefined);

  protected readonly selectedScheduleId = signal<number | null>(null);
  protected readonly selectedBusName = signal<string | null>(null);
  protected readonly seatLayout = signal<SeatLayoutResponse | null>(null);
  protected readonly fetchingSeats = signal(false);
  protected readonly selectedSeatIds = signal<number[]>([]);
  protected readonly isBooking = signal(false);

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

    this.loadTripBookings(trip.tripId);
  }

  private loadTripBookings(tripId: string): void {
    this.scheduleService.getTripBusBookings(tripId).subscribe({
      next: (summary) => this.tripBookings.set(summary.bookings),
      error: () => {},
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

  protected viewSeats(bus: BusSearchResult): void {
    this.selectedScheduleId.set(bus.scheduleId);
    this.selectedBusName.set(bus.busName);
    this.selectedSeatIds.set([]);
    this.fetchingSeats.set(true);

    this.scheduleService.getSeats(bus.scheduleId).subscribe({
      next: (layout) => {
        this.seatLayout.set(layout);
        this.fetchingSeats.set(false);
      },
      error: () => {
        this.toastService.showError('Failed to load seats');
        this.fetchingSeats.set(false);
      },
    });
  }

  protected toggleSeat(seat: SeatResponse): void {
    if (seat.status !== 'AVAILABLE') return;

    const current = this.selectedSeatIds();
    const maxSeats = this.members().length;

    if (current.includes(seat.id)) {
      this.selectedSeatIds.set(current.filter((id) => id !== seat.id));
    } else {
      if (current.length >= maxSeats) {
        this.toastService.showError(`You can only select up to ${maxSeats} seats based on your group size.`);
        return;
      }
      this.selectedSeatIds.set([...current, seat.id]);
    }
  }

  protected get selectedSeatObjects(): SeatResponse[] {
    const layout = this.seatLayout();
    if (!layout) return [];
    return layout.seats.filter((s) => this.selectedSeatIds().includes(s.id));
  }

  protected get totalFare(): number {
    const bus = this.results().find((b) => b.scheduleId === this.selectedScheduleId());
    if (!bus) return 0;
    return this.selectedSeatIds().length * bus.fare;
  }

  protected bookSelectedSeats(): void {
    const scheduleId = this.selectedScheduleId();
    const seatIds = this.selectedSeatIds();
    if (!scheduleId || seatIds.length === 0) return;

    this.isBooking.set(true);

    const passengerDetails: PassengerDetailDto[] = seatIds.map((seatId, index) => {
      const member = this.members()[index];
      return {
        seatId,
        passengerName: member ? member.name : `Passenger ${index + 1}`,
        passengerAge: 25, // Default age
        passengerGender: 'Other', // Default gender
      };
    });

    this.scheduleService
      .createBooking({
        scheduleId,
        seatIds,
        passengerDetails,
      })
      .subscribe({
        next: (bookingResp) => {
          this.scheduleService.attachBookingToTrip(this.trip().tripId, bookingResp.id).subscribe({
            next: () => {
              this.toastService.showSuccess('Bus booked and added to trip!');
              this.isBooking.set(false);
              this.selectedScheduleId.set(null);
              this.seatLayout.set(null);
              this.selectedSeatIds.set([]);
              this.loadTripBookings(this.trip().tripId);
            },
            error: () => {
              this.toastService.showError('Booking succeeded, but failed to attach to trip.');
              this.isBooking.set(false);
            },
          });
        },
        error: (err) => {
          console.error(err);
          const msg = err.error?.error?.message || err.error?.message || err.message || 'Unknown error';
          this.toastService.showError('Failed to create bus booking: ' + msg);
          this.isBooking.set(false);
        },
      });
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
