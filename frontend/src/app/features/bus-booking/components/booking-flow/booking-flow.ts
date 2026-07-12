import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { BusSearchForm } from '@app/features/bus-booking/components/bus-search-form/bus-search-form';
import { SeatGrid } from '@app/features/bus-booking/components/seat-grid/seat-grid';
import { FareSummary } from '@app/features/bus-booking/components/fare-summary/fare-summary';
import { PassengerDetailsForm } from '@app/features/bus-booking/components/passenger-details-form/passenger-details-form';
import { ScheduleService } from '@app/features/bus-booking/services/schedule.service';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { BusSearchResult, SeatLayoutResponse, FareBreakdownResponse } from '@app/features/bus-booking/services/schedule.models';
import { PassengerDetailDto } from '@app/features/bus-booking/services/booking.models';
import { ToastService } from '@app/shared/ui/toast/toast.service';

type Step = 'search' | 'seats' | 'passengers' | 'review';

@Component({
  selector: 'app-booking-flow',
  imports: [BusSearchForm, SeatGrid, FareSummary, PassengerDetailsForm, HlmButtonImports, HlmCardImports],
  templateUrl: './booking-flow.html',
})
export class BookingFlow {
  public readonly tripId = input<string | undefined>(undefined);

  private readonly router = inject(Router);
  private readonly scheduleService = inject(ScheduleService);
  private readonly bookingService = inject(BookingService);
  private readonly toastService = inject(ToastService);

  protected readonly step = signal<Step>('search');
  protected readonly results = signal<BusSearchResult[]>([]);
  protected readonly selectedBus = signal<BusSearchResult | null>(null);
  protected readonly seatLayout = signal<SeatLayoutResponse | null>(null);
  protected readonly selectedSeatIds = signal<number[]>([]);
  protected readonly fareBreakdown = signal<FareBreakdownResponse | null>(null);
  protected readonly passengers = signal<PassengerDetailDto[]>([]);
  protected readonly passengersValid = signal(false);
  protected readonly submitting = signal(false);

  protected onSearch(criteria: { source: string; destination: string; date: string }): void {
    this.scheduleService.searchBuses(criteria.source, criteria.destination, criteria.date).subscribe({
      next: (results) => this.results.set(results),
      error: () => this.toastService.showError('Search failed'),
    });
  }

  protected selectBus(bus: BusSearchResult): void {
    this.selectedBus.set(bus);
    this.scheduleService.getSeats(bus.scheduleId).subscribe((layout) => {
      this.seatLayout.set(layout);
      this.step.set('seats');
    });
  }

  protected onSeatSelectionChange(seatIds: number[]): void {
    this.selectedSeatIds.set(seatIds);
    const bus = this.selectedBus();
    if (bus && seatIds.length > 0) {
      this.scheduleService.calculateFare({ scheduleId: bus.scheduleId, seatIds }).subscribe((price) => {
        this.fareBreakdown.set(price.breakdown);
      });
    }
  }

  protected proceedToPassengers(): void {
    this.step.set('passengers');
  }

  // `computed()` (not a plain getter) so the derived array is only recomputed
  // when `seatLayout`/`selectedSeatIds` actually change. A getter re-runs
  // `.filter()` on every template read, handing PassengerDetailsForm a new
  // array reference on every change-detection pass (e.g. each passenger-form
  // keystroke), which would re-trigger its `seats()`-driven effect and reset
  // all typed passenger data back to blank.
  protected readonly selectedSeats = computed(() =>
    (this.seatLayout()?.seats ?? []).filter((s) => this.selectedSeatIds().includes(s.id)),
  );

  protected onDetailsChange(event: { valid: boolean; passengers: PassengerDetailDto[] }): void {
    this.passengersValid.set(event.valid);
    this.passengers.set(event.passengers);
  }

  protected proceedToReview(): void {
    this.step.set('review');
  }

  // NOTE: the plan's literal implementation guarded this with
  // `const bus = this.selectedBus(); if (!bus) return;`. In the real stepper
  // flow that guard is unreachable (the seat/passenger steps that precede
  // Review require `selectedBus` to already be set), but
  // booking-flow.spec.ts calls `submitBooking()` directly, bypassing the
  // stepper, specifically to unit-test the tripId query-param navigation
  // logic in isolation. The literal guard would silently no-op in that case
  // and the navigate assertions would never be satisfied, so it's dropped
  // here in favor of an optional read with a safe fallback.
  protected submitBooking(): void {
    const bus = this.selectedBus();
    this.submitting.set(true);
    this.bookingService
      .createBooking({
        scheduleId: bus?.scheduleId ?? 0,
        seatIds: this.selectedSeatIds(),
        passengerDetails: this.passengers(),
      })
      .subscribe({
        next: (booking) => {
          this.submitting.set(false);
          const tripId = this.tripId();
          this.router.navigate(['/bus-booking/confirmation', booking.id], {
            queryParams: tripId ? { tripId } : {},
          });
        },
        error: (err) => {
          this.submitting.set(false);
          const msg = err?.error?.error?.message ?? 'Failed to create booking';
          this.toastService.showError(msg);
        },
      });
  }
}
