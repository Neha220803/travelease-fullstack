import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import {
  BookingResponse,
  BookingTimelineResponse,
  CancellationResponse,
  RefundResponse,
} from '@app/features/bus-booking/services/booking.models';
import { CancelBookingDialog } from '@app/features/bus-booking/components/cancel-booking-dialog/cancel-booking-dialog';
import { PartialCancelDialog } from '@app/features/bus-booking/components/partial-cancel-dialog/partial-cancel-dialog';
import { ModifyBookingDialog } from '@app/features/bus-booking/components/modify-booking-dialog/modify-booking-dialog';

const NON_MODIFIABLE = new Set(['CANCELLED', 'COMPLETED', 'EXPIRED', 'FAILED']);
const CANCELLABLE_FULL = new Set(['CONFIRMED', 'PENDING', 'RESERVED']);

@Component({
  selector: 'app-booking-detail',
  imports: [HlmCardImports, HlmButtonImports, CancelBookingDialog, PartialCancelDialog, ModifyBookingDialog],
  templateUrl: './booking-detail.html',
})
export class BookingDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly bookingService = inject(BookingService);

  private readonly id = Number(this.route.snapshot.paramMap.get('id'));

  protected readonly booking = signal<BookingResponse | null>(null);
  protected readonly timeline = signal<BookingTimelineResponse[]>([]);
  protected readonly showCancelDialog = signal(false);
  protected readonly showPartialCancelDialog = signal(false);
  protected readonly showModifyDialog = signal(false);
  protected readonly refunds = signal<RefundResponse[]>([]);

  constructor() {
    this.bookingService.getBookingById(this.id).subscribe((b) => this.booking.set(b));
    this.bookingService.getBookingTimeline(this.id).subscribe((t) => this.timeline.set(t));
    this.bookingService.getRefundsByBooking(this.id).subscribe((r) => this.refunds.set(r));
  }

  protected canModify(): boolean {
    const status = this.booking()?.status;
    return !!status && !NON_MODIFIABLE.has(status);
  }

  protected canCancelFull(): boolean {
    const status = this.booking()?.status;
    return !!status && CANCELLABLE_FULL.has(status);
  }

  protected canPartialCancel(): boolean {
    const b = this.booking();
    // NOTE: the plan's literal `b.seats.length > 1` throws when `seats` is
    // absent from the BookingResponse (as it is in this task's own test
    // fixture, which only supplies id/bookingReference/status/totalFare).
    // Guarded with `?.length ?? 0` so a partial/mocked response degrades to
    // "not eligible" instead of crashing change detection.
    return b?.status === 'CONFIRMED' && (b?.seats?.length ?? 0) > 1;
  }

  protected onCancelled(_response: CancellationResponse): void {
    this.showCancelDialog.set(false);
    this.showPartialCancelDialog.set(false);
    this.bookingService.getBookingById(this.id).subscribe((b) => this.booking.set(b));
  }

  protected onModified(response: BookingResponse): void {
    this.showModifyDialog.set(false);
    this.booking.set(response);
    // The backend generates a BOOKING_MODIFIED timeline event as part of the
    // modify transaction, so the timeline the user is currently looking at is
    // stale as soon as the modify succeeds — re-fetch it here rather than
    // trying to locally guess/append the new entry.
    this.bookingService.getBookingTimeline(this.id).subscribe((t) => this.timeline.set(t));
  }
}
