import { Component, computed, inject, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
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

export type NewActivityField =
  | 'name'
  | 'destinationId'
  | 'durationHours'
  | 'startTime'
  | 'endTime'
  | 'description';

export interface NewActivityDraft {
  name: string;
  destinationId: string;
  durationHours: string;
  startTime: string;
  endTime: string;
  description: string;
}

const EMPTY_NEW_ACTIVITY_DRAFT: NewActivityDraft = {
  name: '',
  destinationId: '',
  durationHours: '',
  startTime: '',
  endTime: '',
  description: '',
};

const ALL_TOUCHED: Record<NewActivityField, boolean> = {
  name: true,
  destinationId: true,
  durationHours: true,
  startTime: true,
  endTime: true,
  description: true,
};

const NONE_TOUCHED: Record<NewActivityField, boolean> = {
  name: false,
  destinationId: false,
  durationHours: false,
  startTime: false,
  endTime: false,
  description: false,
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateNewActivityDraft(
  values: NewActivityDraft,
): Partial<Record<NewActivityField, string>> {
  const errors: Partial<Record<NewActivityField, string>> = {};

  const name = values.name.trim();
  if (!name) {
    errors.name = 'Activity name is required';
  } else if (name.length < 3) {
    errors.name = 'Activity name must be at least 3 characters';
  }

  if (!values.destinationId) {
    errors.destinationId = 'Please select a destination';
  }

  const durationRaw = values.durationHours.trim();
  if (!durationRaw) {
    errors.durationHours = 'Duration is required';
  } else if (!/^-?\d+(\.\d+)?$/.test(durationRaw)) {
    errors.durationHours = 'Duration must be a number';
  } else {
    const duration = Number(durationRaw);
    if (!Number.isInteger(duration)) {
      errors.durationHours = 'Duration must be a whole number';
    } else if (duration <= 0) {
      errors.durationHours = 'Duration must be greater than 0';
    } else if (duration > 99) {
      errors.durationHours = 'Duration must be between 1 and 99 hours';
    }
  }

  if (!values.startTime) {
    errors.startTime = 'Start time is required';
  } else if (!TIME_PATTERN.test(values.startTime)) {
    errors.startTime = 'Start time must be a valid time in HH:MM format';
  }

  if (!values.endTime) {
    errors.endTime = 'End time is required';
  } else if (!TIME_PATTERN.test(values.endTime)) {
    errors.endTime = 'End time must be a valid time in HH:MM format';
  } else if (!errors.startTime && values.startTime && values.endTime <= values.startTime) {
    errors.endTime = 'End time must be after start time';
  }

  const description = values.description.trim();
  if (!description) {
    errors.description = 'Description is required';
  } else if (description.length < 10) {
    errors.description = 'Description must be at least 10 characters';
  }

  return errors;
}

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

  public readonly addActivityDialogState = signal<BrnDialogState>('closed');
  public readonly newActivityDraft = signal<NewActivityDraft>({ ...EMPTY_NEW_ACTIVITY_DRAFT });
  public readonly newActivityTouched = signal<Record<NewActivityField, boolean>>({ ...NONE_TOUCHED });
  public readonly newActivityErrors = computed(() => validateNewActivityDraft(this.newActivityDraft()));
  public readonly newActivityValid = computed(() => Object.keys(this.newActivityErrors()).length === 0);
  public readonly newDestinationId = computed(() => this.newActivityDraft().destinationId);

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
          this.updateNewActivityField('destinationId', String(destinations[0].destinationId));
        }
      },
      error: () => {
        this.destinationsError.set(true);
        this.destinationsLoading.set(false);
      },
    });
  }

  public setAddActivityDialogState(state: BrnDialogState): void {
    this.addActivityDialogState.set(state);
    if (state === 'open') {
      this.createError.set(null);
      const destinations = this.destinations();
      this.newActivityDraft.set({
        ...EMPTY_NEW_ACTIVITY_DRAFT,
        destinationId: destinations.length > 0 ? String(destinations[0].destinationId) : '',
      });
      this.newActivityTouched.set({ ...NONE_TOUCHED });
    }
  }

  public updateNewActivityField(field: NewActivityField, value: string): void {
    this.newActivityDraft.update((draft) => ({ ...draft, [field]: value }));
  }

  public markNewActivityTouched(field: NewActivityField): void {
    this.newActivityTouched.update((touched) => ({ ...touched, [field]: true }));
  }

  public onDurationKeydown(event: KeyboardEvent): void {
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey) {
      return;
    }
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
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
      this.updateNewActivityField('destinationId', value);
      this.markNewActivityTouched('destinationId');
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

    const errors = validateNewActivityDraft({
      name,
      destinationId,
      durationHours,
      startTime,
      endTime,
      description,
    });
    if (Object.keys(errors).length > 0) {
      this.newActivityTouched.set({ ...ALL_TOUCHED });
      this.createError.set('Please fix the highlighted fields before saving.');
      return;
    }

    this.creating.set(true);
    this.activityService
      .createActivity({
        activityName: name.trim(),
        destinationId: Number(destinationId),
        durationHours: Number(durationHours),
        startTime,
        endTime,
        description: description.trim(),
      })
      .subscribe({
        next: (activity) => {
          this.creating.set(false);
          this.overview.update((list) => [...list, { activity, slots: [], bookings: [] }]);
          this.addActivityDialogState.set('closed');
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
