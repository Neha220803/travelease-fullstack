import { Component, effect, inject, input, output, signal } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { ScheduleService } from '@app/features/bus-booking/services/schedule.service';
import { ToastService } from '@app/shared/ui/toast/toast.service';
import { SeatLayoutResponse, SeatResponse } from '@app/features/bus-booking/services/schedule.models';

@Component({
  selector: 'app-seat-grid',
  imports: [HlmBadgeImports],
  templateUrl: './seat-grid.html',
})
export class SeatGrid {
  public readonly scheduleId = input.required<number>();
  public readonly layout = input<SeatLayoutResponse | null>(null);
  public readonly maxSeats = input<number | undefined>(undefined);

  public readonly selectionChange = output<number[]>();
  public readonly lockExpired = output<void>();

  private readonly scheduleService = inject(ScheduleService);
  private readonly toastService = inject(ToastService);

  // Public (not protected) so the seat-grid.spec.ts test can assert on the
  // reconciled selection after a 409 SEAT_UNAVAILABLE conflict.
  public readonly selectedSeatIds = signal<number[]>([]);
  protected readonly lockExpiresAt = signal<Date | null>(null);
  protected readonly secondsRemaining = signal<number | null>(null);

  private countdownHandle: ReturnType<typeof setInterval> | undefined;

  constructor() {
    effect((onCleanup) => {
      const expiresAt = this.lockExpiresAt();
      if (!expiresAt) return;
      this.countdownHandle = setInterval(() => {
        const remaining = Math.round((expiresAt.getTime() - Date.now()) / 1000);
        if (remaining <= 0) {
          this.secondsRemaining.set(0);
          clearInterval(this.countdownHandle);
          this.lockExpired.emit();
        } else {
          this.secondsRemaining.set(remaining);
        }
      }, 1000);
      onCleanup(() => clearInterval(this.countdownHandle));
    });
  }

  protected seatClasses(seat: SeatResponse): string {
    if (seat.status !== 'AVAILABLE') {
      return 'bg-muted text-muted-foreground border-border cursor-not-allowed';
    }
    if (this.selectedSeatIds().includes(seat.id)) {
      return 'bg-primary text-primary-foreground border-primary hover:bg-primary/90';
    }
    return 'bg-card border-border hover:bg-accent hover:text-accent-foreground';
  }

  protected toggleSeat(seat: SeatResponse): void {
    if (seat.status !== 'AVAILABLE') return;

    const current = this.selectedSeatIds();
    if (current.includes(seat.id)) {
      this.scheduleService.unlockSeats(this.scheduleId(), [seat.id]).subscribe();
      const next = current.filter((id) => id !== seat.id);
      this.selectedSeatIds.set(next);
      this.selectionChange.emit(next);
      return;
    }

    const cap = this.maxSeats();
    if (cap !== undefined && current.length >= cap) {
      this.toastService.showError(`You can only select up to ${cap} seats.`);
      return;
    }

    this.scheduleService.lockSeats({ scheduleId: this.scheduleId(), seatIds: [...current, seat.id] }).subscribe({
      next: (lockResponse) => {
        this.lockExpiresAt.set(new Date(lockResponse.expiresAt));
        const next = [...current, seat.id];
        this.selectedSeatIds.set(next);
        this.selectionChange.emit(next);
      },
      error: (err) => {
        const message = err?.error?.error?.message ?? 'That seat is no longer available.';
        this.toastService.showError(message);
        this.selectionChange.emit(current);
      },
    });
  }
}
