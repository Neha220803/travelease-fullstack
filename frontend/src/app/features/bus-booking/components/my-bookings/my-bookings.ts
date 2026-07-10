import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { BookingHistoryResponse } from '@app/features/bus-booking/services/booking.models';

@Component({
  selector: 'app-my-bookings',
  imports: [HlmCardImports, RouterLink],
  templateUrl: './my-bookings.html',
})
export class MyBookings {
  private readonly bookingService = inject(BookingService);

  protected readonly bookings = signal<BookingHistoryResponse[]>([]);
  protected readonly loading = signal(true);

  constructor() {
    this.bookingService.getBookings({}).subscribe({
      next: (page) => {
        this.bookings.set(page.content);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
