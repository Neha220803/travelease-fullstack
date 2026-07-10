import { Component, input } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { QRCodeComponent } from 'angularx-qrcode';
import { TicketResponse } from '@app/features/bus-booking/services/booking.models';

@Component({
  selector: 'app-ticket-card',
  imports: [HlmCardImports, QRCodeComponent],
  templateUrl: './ticket-card.html',
})
export class TicketCard {
  public readonly ticket = input<TicketResponse | null>(null);
}
