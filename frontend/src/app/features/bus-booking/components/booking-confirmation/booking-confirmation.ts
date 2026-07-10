import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { BookingResponse } from '@app/features/bus-booking/services/booking.models';

@Component({
  selector: 'app-booking-confirmation',
  imports: [HlmCardImports, HlmButtonImports, RouterLink],
  templateUrl: './booking-confirmation.html',
})
export class BookingConfirmation {
  private readonly route = inject(ActivatedRoute);
  private readonly bookingService = inject(BookingService);

  protected readonly tripId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('tripId'))),
    { initialValue: null },
  );

  protected readonly booking = signal<BookingResponse | null>(null);
  protected readonly attached = signal(false);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.bookingService.getBookingById(id).subscribe((b) => this.booking.set(b));
  }

  protected attachToTrip(): void {
    const b = this.booking();
    const tripId = this.tripId();
    if (!b || !tripId) return;
    this.bookingService.attachBookingToTrip(tripId, b.id).subscribe(() => this.attached.set(true));
  }
}
