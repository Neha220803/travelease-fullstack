import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TicketCard } from '@app/features/bus-booking/components/ticket-card/ticket-card';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { TicketResponse } from '@app/features/bus-booking/services/booking.models';

@Component({
  selector: 'app-ticket-display',
  imports: [TicketCard],
  templateUrl: './ticket-display.html',
})
export class TicketDisplay {
  private readonly route = inject(ActivatedRoute);
  private readonly bookingService = inject(BookingService);

  protected readonly ticket = signal<TicketResponse | null>(null);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.bookingService.getTicket(id).subscribe((t) => this.ticket.set(t));
  }
}
