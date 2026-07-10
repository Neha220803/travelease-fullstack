import { Component, effect, inject, input, output, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { ScheduleService } from '@app/features/bus-booking/services/schedule.service';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { CancellationPreviewResponse } from '@app/features/bus-booking/services/schedule.models';
import { CancellationResponse } from '@app/features/bus-booking/services/booking.models';

@Component({
  selector: 'app-cancel-booking-dialog',
  imports: [HlmButtonImports],
  templateUrl: './cancel-booking-dialog.html',
})
export class CancelBookingDialog {
  public readonly bookingId = input.required<number>();
  public readonly scheduleId = input.required<number>();
  public readonly totalFare = input.required<number>();
  public readonly cancelled = output<CancellationResponse>();

  private readonly scheduleService = inject(ScheduleService);
  private readonly bookingService = inject(BookingService);

  protected readonly preview = signal<CancellationPreviewResponse | null>(null);
  protected readonly cancelling = signal(false);

  constructor() {
    // NOTE: the plan's literal code called `this.scheduleId()`/`this.totalFare()`
    // (required inputs) directly in the constructor body. That trips Angular's
    // compile-time NG8118 (FORBIDDEN_REQUIRED_INITIALIZER_INVOCATION) check,
    // which forbids reading a required input signal anywhere in a constructor
    // except inside a nested arrow/function expression (the same reason
    // seat-grid.ts reads its own `scheduleId` required input from inside an
    // `effect(...)` callback rather than the constructor body directly).
    // Wrapping the one-time fetch in `effect()` preserves the "fetch eagerly,
    // once, before first meaningful render" behavior while satisfying that check.
    let fetched = false;
    effect(() => {
      if (fetched) return;
      fetched = true;
      this.scheduleService.getCancellationPreview(this.scheduleId(), this.totalFare()).subscribe((p) => this.preview.set(p));
    });
  }

  protected confirmCancel(): void {
    this.cancelling.set(true);
    this.bookingService.cancelBooking(this.bookingId(), { bookingId: this.bookingId(), reason: 'OTHER' }).subscribe((res) => {
      this.cancelling.set(false);
      this.cancelled.emit(res);
    });
  }
}
