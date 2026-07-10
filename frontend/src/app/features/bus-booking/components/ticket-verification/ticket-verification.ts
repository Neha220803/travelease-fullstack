import { Component, inject, signal } from '@angular/core';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { TicketCard } from '@app/features/bus-booking/components/ticket-card/ticket-card';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { TicketResponse } from '@app/features/bus-booking/services/booking.models';

@Component({
  selector: 'app-ticket-verification',
  imports: [HlmInputImports, HlmButtonImports, TicketCard],
  templateUrl: './ticket-verification.html',
})
export class TicketVerification {
  private readonly bookingService = inject(BookingService);

  protected readonly ticketNumber = signal('');
  protected readonly ticket = signal<TicketResponse | null>(null);
  protected readonly error = signal<string | null>(null);

  protected onInput(value: string): void {
    this.ticketNumber.set(value);
  }

  protected verify(): void {
    this.error.set(null);
    this.ticket.set(null);
    this.bookingService.verifyTicket(this.ticketNumber()).subscribe({
      next: (t) => this.ticket.set(t),
      error: () => this.error.set('Ticket not found. Please check the ticket number.'),
    });
  }
}
