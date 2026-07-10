import { Component, OnInit, inject, input, signal } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { BookingFlow } from '@app/features/bus-booking/components/booking-flow/booking-flow';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { TripBusBooking } from '@app/features/bus-booking/services/booking.models';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { Trip, TripMember } from '@app/features/trips/services/trip.models';
import { AuthService } from '@app/core/auth/auth.service';
import { ToastService } from '@app/shared/ui/toast/toast.service';

@Component({
  selector: 'app-trip-travel-tab',
  imports: [HlmCardImports, HlmButtonImports, BookingFlow],
  templateUrl: './trip-travel-tab.html',
})
export class TripTravelTab implements OnInit {
  public readonly trip = input.required<Trip>();
  public readonly members = input.required<TripMember[]>();

  private readonly bookingService = inject(BookingService);
  private readonly destinationsService = inject(DestinationsService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected readonly destinationName = signal('');
  protected readonly tripBookings = signal<TripBusBooking[]>([]);

  ngOnInit(): void {
    const trip = this.trip();
    this.destinationsService.listDestinations().subscribe((destinations) => {
      const match = destinations.find((d) => d.destinationId === trip.destinationId);
      this.destinationName.set(match?.destinationName ?? '');
    });
    this.loadTripBookings(trip.tripId);
  }

  private loadTripBookings(tripId: string): void {
    this.bookingService.getTripBusBookings(tripId).subscribe({
      next: (summary) => this.tripBookings.set(summary.bookings),
      error: () => {},
    });
  }

  protected bookedByName(booking: TripBusBooking): string {
    const trip = this.trip();
    if (booking.bookedByUserId === trip.organizer.userId) return trip.organizer.name;
    const member = this.members().find((m) => m.userId === booking.bookedByUserId);
    return member?.name ?? 'Trip member';
  }

  protected canDetach(booking: TripBusBooking): boolean {
    // NOTE: the plan's draft compared against `.userId`, but the real
    // AuthService.currentUser() (StoredUser, in auth.models.ts) exposes the
    // logged-in user's id under `.id` — confirmed by grepping
    // auth.service.ts/auth.models.ts and the existing convention in
    // trip-expenses-tab.ts (`this.authService.currentUser()?.id`).
    return booking.bookedByUserId === this.authService.currentUser()?.id;
  }

  protected detach(booking: TripBusBooking): void {
    this.bookingService.removeBookingFromTrip(this.trip().tripId, booking.bookingId).subscribe({
      next: () => {
        this.toastService.showSuccess('Booking detached from trip.');
        this.loadTripBookings(this.trip().tripId);
      },
      error: () => this.toastService.showError('Failed to detach booking.'),
    });
  }
}
