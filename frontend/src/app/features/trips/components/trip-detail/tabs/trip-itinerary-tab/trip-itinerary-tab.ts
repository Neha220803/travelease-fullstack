import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { RecommendationsService } from '@app/core/recommendations/recommendations.service';
import { ActivityRecommendation } from '@app/core/recommendations/recommendation.models';
import { ItineraryService } from '@app/features/trips/services/itinerary.service';
import { ItineraryItem, ItineraryProgress } from '@app/features/trips/services/itinerary.models';
import { Trip } from '@app/features/trips/services/trip.models';
import { ToastService } from '@app/shared/ui/toast/toast.service';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { fromIsoDate, toIsoDate } from '@app/core/dates/date-utils';

interface ItineraryDay {
  day: number;
  date: string;
  items: ItineraryItem[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Fixed traveler-facing picker - see seed_data.sql's "ITINERARY BOOKING FLOW"
 * comment for how these map to Activity.provider_name in the seed data. There
 * is no "list providers" endpoint in this flow's API surface. */
export const ACTIVITY_PROVIDERS: readonly string[] = [
  'Skyline Adventures',
  'WanderNest Travels',
  'PeakPath Experiences',
];

export type PaymentField = 'cardNumber' | 'expiry' | 'cvv';

export interface PaymentDraft {
  cardNumber: string;
  expiry: string;
  cvv: string;
}

const EMPTY_PAYMENT_DRAFT: PaymentDraft = { cardNumber: '', expiry: '', cvv: '' };
const NONE_TOUCHED: Record<PaymentField, boolean> = { cardNumber: false, expiry: false, cvv: false };
const ALL_TOUCHED: Record<PaymentField, boolean> = { cardNumber: true, expiry: true, cvv: true };

export function validatePaymentDraft(values: PaymentDraft): Partial<Record<PaymentField, string>> {
  const errors: Partial<Record<PaymentField, string>> = {};

  const cardDigits = values.cardNumber.trim();
  if (!cardDigits) {
    errors.cardNumber = 'Card number is required';
  } else if (!/^\d{12,16}$/.test(cardDigits)) {
    errors.cardNumber = 'Card number must be 12-16 digits';
  }

  if (!values.expiry) {
    errors.expiry = 'Expiry is required';
  } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(values.expiry)) {
    errors.expiry = 'Expiry must be in MM/YY format';
  }

  if (!values.cvv) {
    errors.cvv = 'CVV is required';
  } else if (!/^\d{3}$/.test(values.cvv)) {
    errors.cvv = 'CVV must be exactly 3 digits';
  }

  return errors;
}

export function generateBookingReference(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `BK-${digits}`;
}

@Component({
  selector: 'app-trip-itinerary-tab',
  imports: [
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmInputImports,
    HlmDatePickerImports,
    HlmDialogImports,
    HlmLabelImports,
    StatusBadge,
  ],
  templateUrl: './trip-itinerary-tab.html',
})
export class TripItineraryTab implements OnInit {
  public readonly trip = input.required<Trip>();

  private readonly recommendationsService = inject(RecommendationsService);
  private readonly itineraryService = inject(ItineraryService);
  private readonly toastService = inject(ToastService);

  protected readonly providers = ACTIVITY_PROVIDERS;
  protected readonly recommendations = signal<ActivityRecommendation[]>([]);
  protected readonly selectedProvider = signal<string | null>(null);
  protected readonly activitiesForProvider = computed(() =>
    this.recommendations().filter(
      (r) => r.providerName === this.selectedProvider() && !!r.activityId,
    ),
  );

  private readonly providerByActivityId = computed(() => {
    const map = new Map<string, string>();
    for (const r of this.recommendations()) {
      if (r.activityId && r.providerName) {
        map.set(r.activityId, r.providerName);
      }
    }
    return map;
  });

  protected readonly items = signal<ItineraryItem[]>([]);
  protected readonly progress = signal<ItineraryProgress | null>(null);
  protected readonly itemError = signal<string | null>(null);
  protected readonly customAddError = signal<string | null>(null);
  protected readonly togglingId = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly addingCustom = signal(false);

  protected readonly addDate = signal<Date | undefined>(undefined);
  protected readonly minDate = computed(() => fromIsoDate(this.trip().startDate));
  protected readonly maxDate = computed(() => fromIsoDate(this.trip().endDate));

  protected readonly days = computed<ItineraryDay[]>(() => {
    const startDate = new Date(this.trip().startDate);
    const byDate = new Map<string, ItineraryItem[]>();
    for (const item of this.items()) {
      const list = byDate.get(item.activityDate) ?? [];
      list.push(item);
      byDate.set(item.activityDate, list);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayItems]) => ({
        day: Math.floor((new Date(date).getTime() - startDate.getTime()) / MS_PER_DAY) + 1,
        date,
        items: dayItems,
      }));
  });

  // ── Booking confirmation dialog ──────────────────────────────────────
  protected readonly bookingDialogState = signal<BrnDialogState>('closed');
  protected readonly bookingStage = signal<'form' | 'success'>('form');
  protected readonly selectedActivity = signal<ActivityRecommendation | null>(null);
  protected readonly paymentDraft = signal<PaymentDraft>({ ...EMPTY_PAYMENT_DRAFT });
  protected readonly paymentTouched = signal<Record<PaymentField, boolean>>({ ...NONE_TOUCHED });
  protected readonly paymentErrors = computed(() => validatePaymentDraft(this.paymentDraft()));
  protected readonly paymentValid = computed(() => Object.keys(this.paymentErrors()).length === 0);
  protected readonly paying = signal(false);
  protected readonly bookingReference = signal<string | null>(null);
  protected readonly addingToItinerary = signal(false);

  ngOnInit(): void {
    const trip = this.trip();
    this.addDate.set(fromIsoDate(trip.startDate));

    this.recommendationsService
      .getActivityRecommendations(trip.categoryId, trip.destinationId)
      .subscribe({
        next: (recommendations) => this.recommendations.set(recommendations),
        error: () => {
          // Provider/activity picker just stays empty.
        },
      });

    this.itineraryService.list(trip.tripId).subscribe({
      next: (items) => this.items.set(items),
      error: () => {
        // Day-wise list just stays empty.
      },
    });

    this.refreshProgress();
  }

  protected readonly selectedDateLabel = computed(() => {
    const date = this.addDate();
    return date ? this.formatDate(toIsoDate(date)) : '';
  });

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  }

  /** Itinerary items store startTime/endTime as full ISO date-times; extract just HH:MM. */
  protected formatTime(time: string | null): string {
    if (!time) {
      return '';
    }
    const match = time.match(/T(\d{2}:\d{2})/);
    return match ? match[1] : time;
  }

  protected onAddDateChange(date: Date | undefined): void {
    this.addDate.set(date);
  }

  protected providerNameFor(activityId: string): string | null {
    return this.providerByActivityId().get(activityId) ?? null;
  }

  protected selectProvider(providerName: string): void {
    this.selectedProvider.set(providerName);
  }

  // ── Booking flow ──────────────────────────────────────────────────────

  protected openBooking(activity: ActivityRecommendation): void {
    this.selectedActivity.set(activity);
    this.paymentDraft.set({ ...EMPTY_PAYMENT_DRAFT });
    this.paymentTouched.set({ ...NONE_TOUCHED });
    this.bookingStage.set('form');
    this.bookingReference.set(null);
    this.bookingDialogState.set('open');
  }

  protected setBookingDialogState(state: BrnDialogState): void {
    this.bookingDialogState.set(state);
  }

  protected cancelBooking(): void {
    this.bookingDialogState.set('closed');
  }

  protected updatePaymentField(field: PaymentField, value: string): void {
    this.paymentDraft.update((draft) => ({ ...draft, [field]: value }));
  }

  protected markPaymentTouched(field: PaymentField): void {
    this.paymentTouched.update((touched) => ({ ...touched, [field]: true }));
  }

  protected onCardNumberKeydown(event: KeyboardEvent): void {
    this.allowOnlyDigits(event);
  }

  protected onCvvKeydown(event: KeyboardEvent): void {
    this.allowOnlyDigits(event);
  }

  private allowOnlyDigits(event: KeyboardEvent): void {
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey) {
      return;
    }
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  protected confirmAndPay(): void {
    if (!this.paymentValid()) {
      this.paymentTouched.set({ ...ALL_TOUCHED });
      return;
    }
    this.paying.set(true);
    setTimeout(() => {
      this.paying.set(false);
      this.bookingReference.set(generateBookingReference());
      this.bookingStage.set('success');
    }, 1500);
  }

  protected addToItinerary(): void {
    const activity = this.selectedActivity();
    const trip = this.trip();
    if (!activity || !activity.activityId) {
      return;
    }
    const date = this.addDate() ?? fromIsoDate(trip.startDate);
    const isoDate = toIsoDate(date);

    this.itemError.set(null);
    this.addingToItinerary.set(true);
    this.itineraryService
      .create({
        tripId: trip.tripId,
        activityId: activity.activityId,
        activityDate: isoDate,
        startTime: activity.startTime ? `${isoDate}T${activity.startTime}:00` : undefined,
        endTime: activity.endTime ? `${isoDate}T${activity.endTime}:00` : undefined,
        status: 'Pending',
      })
      .subscribe({
        next: (item) => {
          this.addingToItinerary.set(false);
          this.items.update((list) => [...list, item]);
          this.refreshProgress();
          this.bookingDialogState.set('closed');
          this.toastService.showSuccess('Activity added to your itinerary!');
        },
        error: () => {
          this.addingToItinerary.set(false);
          this.itemError.set('Could not add this activity to your itinerary. Please try again.');
        },
      });
  }

  // The traveler's own free-text plan - no provider, payment or booking involved.
  protected onAddCustomActivity(event: Event, form: HTMLFormElement, name: string): void {
    event.preventDefault();
    this.customAddError.set(null);

    const trimmed = name.trim();
    if (!trimmed) {
      this.customAddError.set('Enter a name for your planned activity.');
      return;
    }

    const trip = this.trip();
    const date = this.addDate() ?? fromIsoDate(trip.startDate);
    this.addingCustom.set(true);
    this.itineraryService
      .create({
        tripId: trip.tripId,
        activityName: trimmed,
        activityDate: toIsoDate(date),
        status: 'Pending',
      })
      .subscribe({
        next: (item) => {
          this.addingCustom.set(false);
          form.reset();
          this.items.update((list) => [...list, item]);
          this.refreshProgress();
        },
        error: () => {
          this.addingCustom.set(false);
          this.customAddError.set('Could not add your activity. Please try again.');
        },
      });
  }

  protected markComplete(item: ItineraryItem): void {
    this.itemError.set(null);
    this.togglingId.set(item.itineraryId);
    this.itineraryService
      .update(item.itineraryId, {
        tripId: item.tripId,
        activityId: item.activityId,
        activityDate: item.activityDate,
        status: 'Completed',
      })
      .subscribe({
        next: (updated) => {
          this.togglingId.set(null);
          this.items.update((list) =>
            list.map((i) => (i.itineraryId === updated.itineraryId ? updated : i)),
          );
          this.refreshProgress();
        },
        error: () => {
          this.togglingId.set(null);
          this.itemError.set('Could not update this item. Please try again.');
        },
      });
  }

  protected deleteItem(item: ItineraryItem): void {
    this.itemError.set(null);
    this.deletingId.set(item.itineraryId);
    this.itineraryService.remove(item.itineraryId).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.items.update((list) => list.filter((i) => i.itineraryId !== item.itineraryId));
        this.refreshProgress();
      },
      error: () => {
        this.deletingId.set(null);
        this.itemError.set('Could not remove this item. Only the trip organizer can delete itinerary items.');
      },
    });
  }

  private refreshProgress(): void {
    this.itineraryService.getProgress(this.trip().tripId).subscribe({
      next: (progress) => this.progress.set(progress),
      error: () => {
        // Progress bar just stays hidden.
      },
    });
  }
}
