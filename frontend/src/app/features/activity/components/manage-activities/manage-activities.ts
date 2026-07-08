import { Component, computed, inject, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { extractErrorMessage } from '@app/core/api/api-error';
import { ActivityService } from '@app/features/activity/services/activity.service';
import {
  Activity,
  ActivityOverview,
  ActivitySlot,
} from '@app/features/activity/services/activity.models';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { Destination } from '@app/core/destinations/destination.models';

@Component({
  selector: 'app-manage-activities',
  imports: [
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
    HlmTextareaImports,
    HlmSelectImports,
    PageHeader,
  ],
  templateUrl: './manage-activities.html',
})
export class ManageActivities {
  private readonly activityService = inject(ActivityService);
  private readonly destinationsService = inject(DestinationsService);

  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  public readonly overview = signal<ActivityOverview[]>([]);

  public readonly activities = computed(() => this.overview().map((o) => o.activity));

  public readonly destinations = signal<Destination[]>([]);
  public readonly destinationsLoading = signal(true);
  public readonly destinationsError = signal(false);

  public readonly newDestinationId = signal('');
  public readonly editDestinationSelections = signal<Record<string, string>>({});

  public readonly creating = signal(false);
  public readonly createError = signal<string | null>(null);

  public readonly savingActivityId = signal<string | null>(null);
  public readonly activityErrors = signal<Record<string, string>>({});

  public readonly savingSlotId = signal<string | null>(null);
  public readonly slotErrors = signal<Record<string, string>>({});
  public readonly editingSlotId = signal<string | null>(null);

  constructor() {
    this.activityService.getProviderOverview().subscribe({
      next: (overview) => {
        this.overview.set(overview);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Something went wrong loading your activities. Please try again.');
        this.loading.set(false);
      },
    });

    this.destinationsService.listDestinations().subscribe({
      next: (destinations) => {
        this.destinations.set(destinations);
        this.destinationsLoading.set(false);
        if (destinations.length > 0) {
          this.newDestinationId.set(String(destinations[0].destinationId));
        }
      },
      error: () => {
        this.destinationsError.set(true);
        this.destinationsLoading.set(false);
      },
    });
  }

  public destinationName(id: number): string {
    const destination = this.destinations().find((d) => d.destinationId === id);
    return destination ? this.destinationLabel(destination) : `Destination #${id}`;
  }

  public destinationLabel(destination: Destination): string {
    return `${destination.destinationName}, ${destination.state}`;
  }

  public readonly destinationIdToLabel = (id: string): string => {
    const destination = this.destinations().find((d) => String(d.destinationId) === id);
    return destination ? this.destinationLabel(destination) : id;
  };

  public onNewDestinationChange(value: string | null | undefined): void {
    if (value) {
      this.newDestinationId.set(value);
    }
  }

  public editDestinationIdFor(activity: Activity): string {
    return this.editDestinationSelections()[activity.activityId] ?? String(activity.destinationId);
  }

  public onEditDestinationChange(activityId: string, value: string | null | undefined): void {
    if (!value) {
      return;
    }
    this.editDestinationSelections.update((selections) => ({ ...selections, [activityId]: value }));
  }

  public slotsFor(activityId: string): ActivitySlot[] {
    return this.overview().find((o) => o.activity.activityId === activityId)?.slots ?? [];
  }

  public remainingCapacityFor(activityId: string): number {
    return this.slotsFor(activityId).reduce((sum, slot) => sum + slot.remainingCapacity, 0);
  }

  public onCreateActivity(
    event: Event,
    name: string,
    destinationId: string,
    durationHours: string,
    startTime: string,
    endTime: string,
    description: string,
  ): void {
    event.preventDefault();
    this.createError.set(null);
    if (!name || !destinationId || !durationHours || !startTime || !endTime) {
      this.createError.set('Please fill in all required fields.');
      return;
    }
    this.creating.set(true);
    this.activityService
      .createActivity({
        activityName: name,
        destinationId: Number(destinationId),
        durationHours: Number(durationHours),
        startTime,
        endTime,
        description,
      })
      .subscribe({
        next: (activity) => {
          this.creating.set(false);
          this.overview.update((list) => [...list, { activity, slots: [], bookings: [] }]);
        },
        error: (err) => {
          this.creating.set(false);
          this.createError.set(
            extractErrorMessage(err, 'Could not create the activity. Please check the fields and try again.'),
          );
        },
      });
  }

  public onUpdateActivity(
    event: Event,
    activity: Activity,
    name: string,
    destinationId: string,
    durationHours: string,
    startTime: string,
    endTime: string,
    description: string,
  ): void {
    event.preventDefault();
    this.setActivityError(activity.activityId, null);
    this.savingActivityId.set(activity.activityId);
    this.activityService
      .updateActivity(activity.activityId, {
        activityName: name,
        destinationId: Number(destinationId),
        durationHours: Number(durationHours),
        startTime,
        endTime,
        description,
      })
      .subscribe({
        next: (updated) => {
          this.savingActivityId.set(null);
          this.overview.update((list) =>
            list.map((o) =>
              o.activity.activityId === updated.activityId ? { ...o, activity: updated } : o,
            ),
          );
        },
        error: (err) => {
          this.savingActivityId.set(null);
          this.setActivityError(
            activity.activityId,
            extractErrorMessage(err, 'Could not update the activity.'),
          );
        },
      });
  }

  public onAddSlot(
    event: Event,
    activityId: string,
    date: string,
    startTime: string,
    endTime: string,
    price: string,
    capacity: string,
  ): void {
    event.preventDefault();
    this.setSlotError(activityId, null);
    if (!date || !startTime || !endTime || !price || !capacity) {
      this.setSlotError(activityId, 'Please fill in all slot fields.');
      return;
    }
    this.savingSlotId.set('new');
    this.activityService
      .createSlot(activityId, {
        activityDate: date,
        startTime,
        endTime,
        price: Number(price),
        capacity: Number(capacity),
      })
      .subscribe({
        next: (slot) => {
          this.savingSlotId.set(null);
          this.overview.update((list) =>
            list.map((o) =>
              o.activity.activityId === activityId ? { ...o, slots: [...o.slots, slot] } : o,
            ),
          );
        },
        error: (err) => {
          this.savingSlotId.set(null);
          this.setSlotError(activityId, extractErrorMessage(err, 'Could not add the slot.'));
        },
      });
  }

  public onUpdateSlot(
    event: Event,
    activityId: string,
    slot: ActivitySlot,
    date: string,
    startTime: string,
    endTime: string,
    price: string,
    capacity: string,
  ): void {
    event.preventDefault();
    this.setSlotError(activityId, null);
    this.savingSlotId.set(slot.activitySlotId);
    this.activityService
      .updateSlot(activityId, slot.activitySlotId, {
        activityDate: date,
        startTime,
        endTime,
        price: Number(price),
        capacity: Number(capacity),
      })
      .subscribe({
        next: (updated) => {
          this.savingSlotId.set(null);
          this.editingSlotId.set(null);
          this.overview.update((list) =>
            list.map((o) =>
              o.activity.activityId === activityId
                ? {
                    ...o,
                    slots: o.slots.map((s) =>
                      s.activitySlotId === updated.activitySlotId ? updated : s,
                    ),
                  }
                : o,
            ),
          );
        },
        error: (err) => {
          this.savingSlotId.set(null);
          this.setSlotError(activityId, extractErrorMessage(err, 'Could not update the slot.'));
        },
      });
  }

  public startEditingSlot(slotId: string): void {
    this.editingSlotId.set(slotId);
  }

  public cancelEditingSlot(): void {
    this.editingSlotId.set(null);
  }

  private setActivityError(activityId: string, message: string | null): void {
    this.activityErrors.update((errors) => {
      const next = { ...errors };
      if (message) {
        next[activityId] = message;
      } else {
        delete next[activityId];
      }
      return next;
    });
  }

  private setSlotError(activityId: string, message: string | null): void {
    this.slotErrors.update((errors) => {
      const next = { ...errors };
      if (message) {
        next[activityId] = message;
      } else {
        delete next[activityId];
      }
      return next;
    });
  }
}
