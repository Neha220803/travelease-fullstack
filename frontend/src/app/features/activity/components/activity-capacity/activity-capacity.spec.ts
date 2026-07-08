import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  ActivityCapacity,
  capacityToneClass,
} from '@app/features/activity/components/activity-capacity/activity-capacity';
import { ActivityService } from '@app/features/activity/services/activity.service';
import { ActivityOverview } from '@app/features/activity/services/activity.models';

describe('capacityToneClass', () => {
  it('uses success above 80% filled', () => {
    expect(capacityToneClass(85)).toBe('bg-success');
  });

  it('uses primary at or below 80% filled', () => {
    expect(capacityToneClass(80)).toBe('bg-primary');
    expect(capacityToneClass(30)).toBe('bg-primary');
  });
});

const OVERVIEW: ActivityOverview[] = [
  {
    activity: {
      activityId: 'act-1',
      providerId: 1,
      destinationId: 3,
      activityName: 'Paragliding',
      durationHours: 1,
      startTime: '09:00',
      endTime: '10:00',
      description: '',
    },
    slots: [
      {
        activitySlotId: 'slot-2',
        activityId: 'act-1',
        activityDate: '2026-07-21',
        startTime: '14:00',
        endTime: '15:00',
        price: 2500,
        capacity: 10,
        remainingCapacity: 10,
      },
      {
        activitySlotId: 'slot-1',
        activityId: 'act-1',
        activityDate: '2026-07-20',
        startTime: '09:00',
        endTime: '10:00',
        price: 2500,
        capacity: 12,
        remainingCapacity: 3,
      },
    ],
    bookings: [],
  },
];

async function setup(activityService: Partial<ActivityService>) {
  await TestBed.configureTestingModule({
    imports: [ActivityCapacity],
    providers: [{ provide: ActivityService, useValue: activityService }],
  }).compileComponents();
  const fixture = TestBed.createComponent(ActivityCapacity);
  fixture.detectChanges();
  return fixture;
}

describe('ActivityCapacity', () => {
  it('sorts slots chronologically and computes used/capacity per slot', async () => {
    const fixture = await setup({ getProviderOverview: () => of(OVERVIEW) });
    const rows = fixture.componentInstance.rows();

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Paragliding');
    expect(rows[0].total).toBe(22);
    expect(rows[0].slots.map((s) => s.id)).toEqual(['slot-1', 'slot-2']);
    expect(rows[0].slots[0]).toMatchObject({ used: 9, capacity: 12 });
    expect(rows[0].slots[1]).toMatchObject({ used: 0, capacity: 10 });
  });

  it('renders the activity name and slot rows', async () => {
    const fixture = await setup({ getProviderOverview: () => of(OVERVIEW) });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Paragliding');
    expect(text).toContain('2026-07-20');
    expect(text).toContain('2026-07-21');
  });

  it('shows an empty state with no activities', async () => {
    const fixture = await setup({ getProviderOverview: () => of([]) });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No activities yet');
  });

  it('shows an error message when loading fails', async () => {
    const fixture = await setup({ getProviderOverview: () => throwError(() => new Error('boom')) });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Something went wrong');
  });
});
