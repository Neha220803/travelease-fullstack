import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker';
import { ActivitiesService } from '@app/core/activities/activities.service';
import { Activity } from '@app/core/activities/activity.models';
import { ItineraryService } from '@app/features/trips/services/itinerary.service';
import { ItineraryItem } from '@app/features/trips/services/itinerary.models';
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
  imports: [NgIcon, HlmCardImports, HlmButtonImports, HlmDatePickerImports],
  templateUrl: './trip-itinerary-tab.html',
})
export class TripItineraryTab implements OnInit {
  public readonly trip = input.required<Trip>();

  private readonly activitiesService = inject(ActivitiesService);
  private readonly itineraryService = inject(ItineraryService);

  protected readonly availableActivities = signal<Activity[]>([]);
  protected readonly items = signal<ItineraryItem[]>([]);
  protected readonly addError = signal<string | null>(null);
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

  ngOnInit(): void {
    const trip = this.trip();
    this.addDate.set(fromIsoDate(trip.startDate));

    this.activitiesService.getActivities(trip.destinationId).subscribe({
      next: (activities) => this.availableActivities.set(activities),
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
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  }

  protected onAddDateChange(date: Date | undefined): void {
    this.addDate.set(date);
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
        next: (item) => this.items.update((list) => [...list, item]),
        error: () => this.addError.set('Could not add this activity. Please try again.'),
      });
  }
}
