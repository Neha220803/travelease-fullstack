import { Component, effect, inject, input, output, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { BookingResponse, BookingSeatResponse, PassengerDetailDto } from '@app/features/bus-booking/services/booking.models';
import { ToastService } from '@app/shared/ui/toast/toast.service';

interface ModifyPassengerRow {
  seatId: number;
  seatNumber: string;
  name: string;
  age: number | null;
  gender: 'FEMALE' | 'MALE' | 'OTHER';
}

// KNOWN PRE-EXISTING BACKEND CONTRACT ISSUE (live-verified during this task,
// not introduced by it, and out of scope to fix since backend Java is
// off-limits here): BookingMapper.toResponse() serializes each booking
// seat's row-level `BookingSeat.id` as "id" in GET /api/bookings/{id}'s
// `seats[]`, e.g. seed data proves BookingSeat #6 wraps physical Seat #117
// on a real booking. But both modifyBooking() and the already-shipped
// partialCancelBooking() match incoming seat ids against
// `bookingSeat.getSeat().getId()` (the physical Seat's own id) — a value
// this response never exposes anywhere. So no frontend can derive the
// "correct" seatId from BookingResponse.seats[] alone; sending the
// documented `seatId` field (as this booking.models.ts interface, and the
// sibling partial-cancel-dialog.ts, both already do) is the correct,
// spec-consistent choice — the passenger-detail rows simply won't take
// effect server-side until the backend mapper is fixed, while
// contactEmail/contactPhone updates (which don't depend on seat ids) work
// correctly end-to-end, as live-verified via curl in this task.
@Component({
  selector: 'app-modify-booking-dialog',
  imports: [HlmButtonImports, HlmInputImports, HlmLabelImports, HlmCardImports],
  templateUrl: './modify-booking-dialog.html',
})
export class ModifyBookingDialog {
  public readonly bookingId = input.required<number>();
  public readonly contactEmail = input<string | null>(null);
  public readonly contactPhone = input<string | null>(null);
  public readonly seats = input.required<BookingSeatResponse[]>();
  public readonly modified = output<BookingResponse>();
  public readonly cancelled = output<void>();

  private readonly bookingService = inject(BookingService);
  private readonly toastService = inject(ToastService);

  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly rows = signal<ModifyPassengerRow[]>([]);
  protected readonly submitting = signal(false);

  constructor() {
    // NOTE: mirrors the one-time-populate pattern already used in
    // cancel-booking-dialog.ts — this component is only ever instantiated
    // fresh (via the parent's `@if`), so a guarded effect prepopulates the
    // form once from the current BookingResponse fields without fighting
    // the user's subsequent edits on later change-detection runs.
    let populated = false;
    effect(() => {
      if (populated) return;
      const seats = this.seats();
      populated = true;
      this.email.set(this.contactEmail() ?? '');
      this.phone.set(this.contactPhone() ?? '');
      this.rows.set(
        seats.map((s) => ({
          seatId: s.seatId,
          seatNumber: s.seatNumber,
          name: s.passengerName,
          age: s.passengerAge,
          gender: (s.passengerGender as 'FEMALE' | 'MALE' | 'OTHER') ?? 'OTHER',
        })),
      );
    });
  }

  protected updateRow(seatId: number, patch: Partial<ModifyPassengerRow>): void {
    this.rows.set(this.rows().map((r) => (r.seatId === seatId ? { ...r, ...patch } : r)));
  }

  protected submit(): void {
    const updatedPassengerDetails: PassengerDetailDto[] = this.rows().map((r) => ({
      seatId: r.seatId,
      passengerName: r.name,
      passengerAge: r.age ?? 0,
      passengerGender: r.gender,
    }));

    this.submitting.set(true);
    this.bookingService
      .modifyBooking({
        bookingId: this.bookingId(),
        contactEmail: this.email(),
        contactPhone: this.phone(),
        updatedPassengerDetails,
      })
      .subscribe({
        next: (response) => {
          this.submitting.set(false);
          this.toastService.showSuccess('Booking updated successfully.');
          this.modified.emit(response);
        },
        error: (err) => {
          this.submitting.set(false);
          const message = err?.error?.error?.message ?? 'Unable to modify this booking.';
          this.toastService.showError(message);
        },
      });
  }
}
