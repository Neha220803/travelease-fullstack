import { Component, inject, input, output, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { BookingSeatResponse, CancellationResponse } from '@app/features/bus-booking/services/booking.models';

@Component({
  selector: 'app-partial-cancel-dialog',
  imports: [HlmButtonImports],
  templateUrl: './partial-cancel-dialog.html',
})
export class PartialCancelDialog {
  public readonly bookingId = input.required<number>();
  public readonly seats = input.required<BookingSeatResponse[]>();
  public readonly cancelled = output<CancellationResponse>();

  private readonly bookingService = inject(BookingService);

  protected readonly selectedSeatIds = signal<number[]>([]);

  protected toggleSeat(seatId: number): void {
    const current = this.selectedSeatIds();
    this.selectedSeatIds.set(current.includes(seatId) ? current.filter((id) => id !== seatId) : [...current, seatId]);
  }

  protected isAllSelected(): boolean {
    return this.selectedSeatIds().length === this.seats().length && this.seats().length > 0;
  }

  protected canConfirm(): boolean {
    return this.selectedSeatIds().length > 0 && !this.isAllSelected();
  }

  protected confirmPartialCancel(): void {
    if (!this.canConfirm()) return;
    this.bookingService
      .partialCancelBooking({ bookingId: this.bookingId(), seatIds: this.selectedSeatIds(), reason: 'OTHER' })
      .subscribe((res) => this.cancelled.emit(res));
  }
}
