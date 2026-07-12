import { TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { lucidePlus } from '@ng-icons/lucide';
import { Subject, of, throwError } from 'rxjs';
import {
  ManageActivities,
  validateNewActivityDraft,
  NewActivityDraft,
} from '@app/features/activity/components/manage-activities/manage-activities';
import { ActivityService } from '@app/features/activity/services/activity.service';
import { Activity, ActivityOverview, ActivitySlot } from '@app/features/activity/services/activity.models';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { Destination } from '@app/core/destinations/destination.models';

const SAMPLE_ACTIVITY: Activity = {
  activityId: 'act-1',
  providerId: 1,
  destinationId: 3,
  activityName: 'Paragliding',
  durationHours: 1,
  startTime: '09:00',
  endTime: '10:00',
  description: 'Coastal paragliding',
  price: 2500,
};

const SAMPLE_DESTINATIONS: Destination[] = [
  { destinationId: 2, destinationName: 'Goa', state: 'Goa', country: 'India', description: '' },
  { destinationId: 3, destinationName: 'Manali', state: 'Himachal Pradesh', country: 'India', description: '' },
];

const SAMPLE_SLOT: ActivitySlot = {
  activitySlotId: 'slot-1',
  activityId: 'act-1',
  activityDate: '2026-07-20',
  startTime: '09:00',
  endTime: '10:00',
  price: 2500,
  capacity: 10,
  remainingCapacity: 4,
};

const OVERVIEW: ActivityOverview[] = [{ activity: SAMPLE_ACTIVITY, slots: [SAMPLE_SLOT], bookings: [] }];

const VALID_DRAFT: NewActivityDraft = {
  name: 'Scuba Diving',
  destinationId: '3',
  durationHours: '2',
  startTime: '08:00',
  endTime: '10:00',
  description: 'Deep sea diving experience',
};

async function setup(
  activityService: Partial<ActivityService>,
  destinationsService: Partial<DestinationsService> = {
    listDestinations: () => of(SAMPLE_DESTINATIONS),
  },
) {
  await TestBed.configureTestingModule({
    imports: [ManageActivities],
    providers: [
      provideIcons({ lucidePlus }),
      { provide: ActivityService, useValue: activityService },
      { provide: DestinationsService, useValue: destinationsService },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ManageActivities);
  fixture.detectChanges();
  return fixture;
}

describe('validateNewActivityDraft', () => {
  it('accepts a fully valid draft', () => {
    expect(validateNewActivityDraft(VALID_DRAFT)).toEqual({});
  });

  it('requires a name of at least 3 characters', () => {
    expect(validateNewActivityDraft({ ...VALID_DRAFT, name: '' }).name).toBe('Activity name is required');
    expect(validateNewActivityDraft({ ...VALID_DRAFT, name: 'AB' }).name).toBe(
      'Activity name must be at least 3 characters',
    );
  });

  it('requires a destination to be selected', () => {
    expect(validateNewActivityDraft({ ...VALID_DRAFT, destinationId: '' }).destinationId).toBe(
      'Please select a destination',
    );
  });

  it('requires duration to be a whole number between 1 and 99', () => {
    expect(validateNewActivityDraft({ ...VALID_DRAFT, durationHours: '' }).durationHours).toBe(
      'Duration is required',
    );
    expect(validateNewActivityDraft({ ...VALID_DRAFT, durationHours: 'abc' }).durationHours).toBe(
      'Duration must be a number',
    );
    expect(validateNewActivityDraft({ ...VALID_DRAFT, durationHours: '2.5' }).durationHours).toBe(
      'Duration must be a whole number',
    );
    expect(validateNewActivityDraft({ ...VALID_DRAFT, durationHours: '0' }).durationHours).toBe(
      'Duration must be greater than 0',
    );
    expect(validateNewActivityDraft({ ...VALID_DRAFT, durationHours: '100' }).durationHours).toBe(
      'Duration must be between 1 and 99 hours',
    );
  });

  it('requires end time to be after start time', () => {
    expect(
      validateNewActivityDraft({ ...VALID_DRAFT, startTime: '10:00', endTime: '09:00' }).endTime,
    ).toBe('End time must be after start time');
  });

  it('requires a description of at least 10 characters', () => {
    expect(validateNewActivityDraft({ ...VALID_DRAFT, description: '' }).description).toBe(
      'Description is required',
    );
    expect(validateNewActivityDraft({ ...VALID_DRAFT, description: 'too short' }).description).toBe(
      'Description must be at least 10 characters',
    );
  });
});

describe('ManageActivities', () => {
  it('shows a loading state before activities arrive', async () => {
    const subject = new Subject<ActivityOverview[]>();
    const fixture = await setup({ getProviderOverview: () => subject.asObservable() });
    expect(fixture.componentInstance.loading()).toBe(true);
  });

  it('renders every activity name and slot summary', async () => {
    const fixture = await setup({ getProviderOverview: () => of(OVERVIEW) });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Paragliding');
    expect(text).toContain('Manali, Himachal Pradesh');
    expect(text).toContain('1 slot(s)');
    expect(text).toContain('4 open');
  });

  it('shows an empty state with no activities', async () => {
    const fixture = await setup({ getProviderOverview: () => of([]) });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No activities listed yet');
  });

  it('shows an error message when loading fails', async () => {
    const fixture = await setup({
      getProviderOverview: () => throwError(() => new Error('boom')),
    });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Something went wrong');
  });

  it('creates an activity and appends it to the list', async () => {
    const newActivity: Activity = { ...SAMPLE_ACTIVITY, activityId: 'act-2', activityName: 'Scuba Diving' };
    const createActivity = vi.fn().mockReturnValue(of(newActivity));
    const fixture = await setup({ getProviderOverview: () => of(OVERVIEW), createActivity });

    const fakeEvent = { preventDefault: () => {} } as Event;
    fixture.componentInstance.onCreateActivity(
      fakeEvent,
      VALID_DRAFT.name,
      VALID_DRAFT.destinationId,
      VALID_DRAFT.durationHours,
      VALID_DRAFT.startTime,
      VALID_DRAFT.endTime,
      VALID_DRAFT.description,
    );
    fixture.detectChanges();

    expect(createActivity).toHaveBeenCalledWith({
      activityName: 'Scuba Diving',
      destinationId: 3,
      durationHours: 2,
      startTime: '08:00',
      endTime: '10:00',
      description: 'Deep sea diving experience',
    });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Scuba Diving');
  });

  it('closes the Add Activity dialog after a successful create', async () => {
    const newActivity: Activity = { ...SAMPLE_ACTIVITY, activityId: 'act-2', activityName: 'Scuba Diving' };
    const createActivity = vi.fn().mockReturnValue(of(newActivity));
    const fixture = await setup({ getProviderOverview: () => of(OVERVIEW), createActivity });
    const component = fixture.componentInstance;

    component.setAddActivityDialogState('open');
    expect(component.addActivityDialogState()).toBe('open');

    const fakeEvent = { preventDefault: () => {} } as Event;
    component.onCreateActivity(
      fakeEvent,
      VALID_DRAFT.name,
      VALID_DRAFT.destinationId,
      VALID_DRAFT.durationHours,
      VALID_DRAFT.startTime,
      VALID_DRAFT.endTime,
      VALID_DRAFT.description,
    );
    fixture.detectChanges();

    expect(component.addActivityDialogState()).toBe('closed');
  });

  it('rejects creating an activity with invalid fields and marks every field touched', async () => {
    const createActivity = vi.fn();
    const fixture = await setup({ getProviderOverview: () => of(OVERVIEW), createActivity });
    const component = fixture.componentInstance;

    const fakeEvent = { preventDefault: () => {} } as Event;
    component.onCreateActivity(fakeEvent, '', '3', '2', '08:00', '10:00', '');

    expect(createActivity).not.toHaveBeenCalled();
    expect(component.createError()).toBe('Please fix the highlighted fields before saving.');
    expect(component.newActivityTouched().name).toBe(true);
    expect(component.newActivityTouched().description).toBe(true);
  });

  it('keeps field errors hidden until the field is touched, then shows and clears them', async () => {
    const fixture = await setup({ getProviderOverview: () => of(OVERVIEW) });
    const component = fixture.componentInstance;

    component.updateNewActivityField('name', '');
    expect(component.newActivityErrors().name).toBe('Activity name is required');
    expect(component.newActivityTouched().name).toBe(false);

    component.markNewActivityTouched('name');
    expect(component.newActivityTouched().name).toBe(true);

    component.updateNewActivityField('name', 'Scuba Diving');
    expect(component.newActivityErrors().name).toBeUndefined();
  });

  it('keeps Save Activity disabled until the whole draft is valid', async () => {
    const fixture = await setup({ getProviderOverview: () => of(OVERVIEW) });
    const component = fixture.componentInstance;

    component.setAddActivityDialogState('open');
    expect(component.newActivityValid()).toBe(false);

    component.updateNewActivityField('name', VALID_DRAFT.name);
    component.updateNewActivityField('durationHours', VALID_DRAFT.durationHours);
    component.updateNewActivityField('startTime', VALID_DRAFT.startTime);
    component.updateNewActivityField('endTime', VALID_DRAFT.endTime);
    component.updateNewActivityField('description', VALID_DRAFT.description);

    expect(component.newActivityValid()).toBe(true);
  });

  it('updates an activity in place', async () => {
    const updated: Activity = { ...SAMPLE_ACTIVITY, activityName: 'Paragliding Deluxe' };
    const updateActivity = vi.fn().mockReturnValue(of(updated));
    const fixture = await setup({ getProviderOverview: () => of(OVERVIEW), updateActivity });

    const fakeEvent = { preventDefault: () => {} } as Event;
    fixture.componentInstance.onUpdateActivity(
      fakeEvent,
      SAMPLE_ACTIVITY,
      'Paragliding Deluxe',
      '3',
      '1',
      '09:00',
      '10:00',
      'Coastal paragliding',
    );
    fixture.detectChanges();

    expect(updateActivity).toHaveBeenCalledWith('act-1', {
      activityName: 'Paragliding Deluxe',
      destinationId: 3,
      durationHours: 1,
      startTime: '09:00',
      endTime: '10:00',
      description: 'Coastal paragliding',
    });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Paragliding Deluxe');
  });

  it('adds a slot to the right activity', async () => {
    const newSlot: ActivitySlot = { ...SAMPLE_SLOT, activitySlotId: 'slot-2', activityDate: '2026-07-21' };
    const createSlot = vi.fn().mockReturnValue(of(newSlot));
    const fixture = await setup({ getProviderOverview: () => of(OVERVIEW), createSlot });

    const fakeEvent = { preventDefault: () => {} } as Event;
    fixture.componentInstance.onAddSlot(fakeEvent, 'act-1', '2026-07-21', '09:00', '10:00', '2500', '10');
    fixture.detectChanges();

    expect(createSlot).toHaveBeenCalledWith('act-1', {
      activityDate: '2026-07-21',
      startTime: '09:00',
      endTime: '10:00',
      price: 2500,
      capacity: 10,
    });
    expect(fixture.componentInstance.slotsFor('act-1')).toContain(newSlot);
  });

  it('updates a slot in place and stops editing it', async () => {
    const updatedSlot: ActivitySlot = { ...SAMPLE_SLOT, price: 3000, capacity: 12 };
    const updateSlot = vi.fn().mockReturnValue(of(updatedSlot));
    const fixture = await setup({ getProviderOverview: () => of(OVERVIEW), updateSlot });
    fixture.componentInstance.startEditingSlot('slot-1');

    const fakeEvent = { preventDefault: () => {} } as Event;
    fixture.componentInstance.onUpdateSlot(
      fakeEvent,
      'act-1',
      SAMPLE_SLOT,
      '2026-07-20',
      '09:00',
      '10:00',
      '3000',
      '12',
    );
    fixture.detectChanges();

    expect(updateSlot).toHaveBeenCalledWith('act-1', 'slot-1', {
      activityDate: '2026-07-20',
      startTime: '09:00',
      endTime: '10:00',
      price: 3000,
      capacity: 12,
    });
    expect(fixture.componentInstance.slotsFor('act-1')[0].price).toBe(3000);
    expect(fixture.componentInstance.editingSlotId()).toBeNull();
  });

  it('resolves a destination name for a known id and falls back to a placeholder for an unknown one', async () => {
    const fixture = await setup({ getProviderOverview: () => of(OVERVIEW) });
    const c = fixture.componentInstance;
    expect(c.destinationName(3)).toBe('Manali, Himachal Pradesh');
    expect(c.destinationName(999)).toBe('Destination #999');
  });

  it('defaults the new-activity destination selection to the first loaded destination', async () => {
    const fixture = await setup({ getProviderOverview: () => of(OVERVIEW) });
    expect(fixture.componentInstance.newDestinationId()).toBe('2');
  });

  it('flags destinationsError when the destinations request fails', async () => {
    const fixture = await setup(
      { getProviderOverview: () => of(OVERVIEW) },
      { listDestinations: () => throwError(() => new Error('boom')) },
    );
    expect(fixture.componentInstance.destinationsError()).toBe(true);
    expect(fixture.componentInstance.destinationsLoading()).toBe(false);
  });
});
