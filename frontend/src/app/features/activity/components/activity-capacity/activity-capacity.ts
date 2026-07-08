import { Component, computed, inject, signal } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { ActivityService } from '@app/features/activity/services/activity.service';
import { ActivityOverview } from '@app/features/activity/services/activity.models';

interface SlotView {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  used: number;
  capacity: number;
  pct: number;
  toneClass: string;
}

interface ActivityCapacityRow {
  id: string;
  name: string;
  total: number;
  slots: SlotView[];
}

export function capacityToneClass(pct: number): string {
  return pct > 80 ? 'bg-success' : 'bg-primary';
}

@Component({
  selector: 'app-activity-capacity',
  imports: [HlmCardImports, PageHeader],
  templateUrl: './activity-capacity.html',
})
export class ActivityCapacity {
  private readonly activityService = inject(ActivityService);

  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  private readonly overview = signal<ActivityOverview[]>([]);

  public readonly rows = computed<ActivityCapacityRow[]>(() =>
    this.overview().map((o) => {
      const slots: SlotView[] = [...o.slots]
        .sort((a, b) => `${a.activityDate}${a.startTime}`.localeCompare(`${b.activityDate}${b.startTime}`))
        .map((slot) => {
          const used = slot.capacity - slot.remainingCapacity;
          const pct = slot.capacity > 0 ? (used / slot.capacity) * 100 : 0;
          return {
            id: slot.activitySlotId,
            date: slot.activityDate,
            startTime: slot.startTime,
            endTime: slot.endTime,
            price: slot.price,
            used,
            capacity: slot.capacity,
            pct,
            toneClass: capacityToneClass(pct),
          };
        });
      return {
        id: o.activity.activityId,
        name: o.activity.activityName,
        total: o.slots.reduce((s, slot) => s + slot.capacity, 0),
        slots,
      };
    }),
  );

  constructor() {
    this.activityService.getProviderOverview().subscribe({
      next: (overview) => {
        this.overview.set(overview);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Something went wrong loading capacity data. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
