import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { ActivitiesService } from '@app/core/activities/activities.service';
import { Activity } from '@app/core/activities/activity.models';
import { ItineraryService } from '@app/features/trips/services/itinerary.service';
import {
  ItineraryItem,
  ItineraryProgress,
  ItineraryStatus,
} from '@app/features/trips/services/itinerary.models';
import { Trip } from '@app/features/trips/services/trip.models';
import { fromIsoDate, toIsoDate } from '@app/core/dates/date-utils';

interface ItineraryDay {
  day: number;
  date: string;
  items: ItineraryItem[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Component({
  selector: 'app-trip-itinerary-tab',
  imports: [
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmDatePickerImports,
    HlmDialogImports,
    HlmSelectImports,
    HlmLabelImports,
  ],
  templateUrl: './trip-itinerary-tab.html',
})
export class TripItineraryTab implements OnInit {
  public readonly trip = input.required<Trip>();

  private readonly activitiesService = inject(ActivitiesService);
  private readonly itineraryService = inject(ItineraryService);

  protected readonly availableActivities = signal<Activity[]>([]);
  protected readonly items = signal<ItineraryItem[]>([]);
  protected readonly progress = signal<ItineraryProgress | null>(null);
  protected readonly addError = signal<string | null>(null);
  protected readonly itemError = signal<string | null>(null);
  protected readonly addDate = signal<Date | undefined>(undefined);
  protected readonly selectedActivityId = signal<string>('');
  protected readonly togglingId = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);
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

  ngOnInit(): void {
    const trip = this.trip();
    this.addDate.set(fromIsoDate(trip.startDate));

    this.activitiesService.getActivities(trip.destinationId).subscribe({
      next: (activities) => {
        this.availableActivities.set(activities);
        if (activities.length > 0) {
          this.selectedActivityId.set(activities[0].activityId);
        }
      },
      error: () => {
        // Sidebar just stays empty.
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

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  }

  protected onAddDateChange(date: Date | undefined): void {
    this.addDate.set(date);
  }

  protected readonly activityIdToLabel = (id: string): string => {
    const activity = this.availableActivities().find((a) => a.activityId === id);
    return activity ? activity.activityName : id;
  };

  protected onSelectedActivityChange(activityId: string | null | undefined): void {
    if (activityId) {
      this.selectedActivityId.set(activityId);
    }
  }

  protected onAddActivitySubmit(): void {
    const activity = this.availableActivities().find((a) => a.activityId === this.selectedActivityId());
    if (activity) {
      this.onAddActivity(activity);
    }
  }

  protected onAddActivity(activity: Activity): void {
    const trip = this.trip();
    const date = this.addDate() ?? fromIsoDate(trip.startDate);
    this.addError.set(null);
    this.itineraryService
      .create({
        tripId: trip.tripId,
        activityId: activity.activityId,
        activityDate: toIsoDate(date),
        status: 'Pending',
      })
      .subscribe({
        next: (item) => {
          this.items.update((list) => [...list, item]);
          this.refreshProgress();
        },
        error: () => this.addError.set('Could not add this activity. Please try again.'),
      });
  }

  protected toggleStatus(item: ItineraryItem): void {
    const nextStatus: ItineraryStatus = item.status === 'Completed' ? 'Pending' : 'Completed';
    this.itemError.set(null);
    this.togglingId.set(item.itineraryId);
    this.itineraryService
      .update(item.itineraryId, {
        tripId: item.tripId,
        activityId: item.activityId,
        activityDate: item.activityDate,
        status: nextStatus,
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
