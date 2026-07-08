import { Component, computed, inject, signal } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { extractErrorMessage } from '@app/core/api/api-error';
import { ActivityService } from '@app/features/activity/services/activity.service';
import { ActivityBooking, ActivityOverview } from '@app/features/activity/services/activity.models';

@Component({
  selector: 'app-activity-bookings',
  imports: [HlmCardImports, HlmButtonImports, PageHeader, StatusBadge],
  templateUrl: './activity-bookings.html',
})
export class ActivityBookings {
  private readonly activityService = inject(ActivityService);

  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  private readonly overview = signal<ActivityOverview[]>([]);

  public readonly bookings = computed(() =>
    [...this.overview().flatMap((o) => o.bookings)].sort((a, b) => b.bookedAt.localeCompare(a.bookedAt)),
  );

  public readonly savingBookingId = signal<string | null>(null);
  public readonly bookingErrors = signal<Record<string, string>>({});

  constructor() {
    this.activityService.getProviderOverview().subscribe({
      next: (overview) => {
        this.overview.set(overview);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Something went wrong loading your bookings. Please try again.');
        this.loading.set(false);
      },
    });
  }

  public markAttendance(booking: ActivityBooking, status: 'ATTENDED' | 'NO_SHOW'): void {
    this.setBookingError(booking.bookingId, null);
    this.savingBookingId.set(booking.bookingId);
    this.activityService.markAttendance(booking.bookingId, status).subscribe({
      next: (updated) => {
        this.savingBookingId.set(null);
        this.overview.update((list) =>
          list.map((o) => ({
            ...o,
            bookings: o.bookings.map((b) => (b.bookingId === updated.bookingId ? updated : b)),
          })),
        );
      },
      error: (err) => {
        this.savingBookingId.set(null);
        this.setBookingError(
          booking.bookingId,
          extractErrorMessage(err, 'Could not update attendance for this booking.'),
        );
      },
    });
  }

  private setBookingError(bookingId: string, message: string | null): void {
    this.bookingErrors.update((errors) => {
      const next = { ...errors };
      if (message) {
        next[bookingId] = message;
      } else {
        delete next[bookingId];
      }
      return next;
    });
  }
}
