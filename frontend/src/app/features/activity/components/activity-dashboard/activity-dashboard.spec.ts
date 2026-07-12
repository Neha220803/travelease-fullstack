import { TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { lucideActivity, lucideCalendarDays, lucideUsers, lucideWallet } from '@ng-icons/lucide';
import { Subject, of, throwError } from 'rxjs';
import {
  ActivityDashboard,
  isRevenueEligible,
  isSameMonth,
  occupancyTone,
} from '@app/features/activity/components/activity-dashboard/activity-dashboard';
import { ActivityService } from '@app/features/activity/services/activity.service';
import { ActivityOverview } from '@app/features/activity/services/activity.models';

describe('occupancyTone', () => {
  it('returns the success tone above 80%', () => {
    expect(occupancyTone(85)).toBe('bg-success');
  });

  it('returns the primary tone between 51% and 80%', () => {
    expect(occupancyTone(60)).toBe('bg-primary');
  });

  it('returns the warning tone at or below 50%', () => {
    expect(occupancyTone(30)).toBe('bg-warning');
  });
});

describe('isRevenueEligible', () => {
  it('excludes cancelled bookings', () => {
    expect(isRevenueEligible('CANCELLED')).toBe(false);
  });

  it('includes confirmed, attended and no-show bookings', () => {
    expect(isRevenueEligible('CONFIRMED')).toBe(true);
    expect(isRevenueEligible('ATTENDED')).toBe(true);
    expect(isRevenueEligible('NO_SHOW')).toBe(true);
  });
});

describe('isSameMonth', () => {
  it('matches dates within the same month and year', () => {
    expect(isSameMonth('2026-07-08T10:00:00Z', new Date('2026-07-01'))).toBe(true);
  });

  it('does not match a different month', () => {
    expect(isSameMonth('2026-06-30T10:00:00Z', new Date('2026-07-01'))).toBe(false);
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
      description: 'Coastal paragliding',
      price: null,
    },
    slots: [
      {
        activitySlotId: 'slot-1',
        activityId: 'act-1',
        activityDate: '2026-07-20',
        startTime: '09:00',
        endTime: '10:00',
        price: 2500,
        capacity: 10,
        remainingCapacity: 4,
      },
    ],
    bookings: [
      {
        bookingId: 'booking-1',
        activitySlotId: 'slot-1',
        activityId: 'act-1',
        activityName: 'Paragliding',
        activityDate: '2026-07-20',
        startTime: '09:00',
        endTime: '10:00',
        participantCount: 6,
        pricePerParticipant: 2500,
        totalAmount: 15000,
        status: 'CONFIRMED',
        bookedAt: new Date().toISOString(),
        bookedByUserId: 'user-1',
      },
    ],
  },
];

async function setup(activityService: Partial<ActivityService>) {
  await TestBed.configureTestingModule({
    imports: [ActivityDashboard],
    providers: [
      provideIcons({ lucideActivity, lucideCalendarDays, lucideUsers, lucideWallet }),
      { provide: ActivityService, useValue: activityService },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ActivityDashboard);
  fixture.detectChanges();
  return fixture;
}

describe('ActivityDashboard', () => {
  it('shows loading skeletons before the overview arrives', async () => {
    const subject = new Subject<ActivityOverview[]>();
    const fixture = await setup({ getProviderOverview: () => subject.asObservable() });
    expect(fixture.componentInstance.loading()).toBe(true);
  });

  it('computes stats and occupancy from the provider overview', async () => {
    const fixture = await setup({ getProviderOverview: () => of(OVERVIEW) });
    const c = fixture.componentInstance;

    expect(c.activitiesListed()).toBe(1);
    expect(c.bookingsReceived()).toBe(1);
    expect(c.availableSlots()).toBe(4);
    expect(c.revenueMtd()).toBe('₹15k');
    expect(c.occupancy()).toEqual([
      { id: 'act-1', name: 'Paragliding', booked: 6, slots: 10, pct: 60, toneClass: 'bg-primary' },
    ]);
  });

  it('renders the activity name and a recent booking', async () => {
    const fixture = await setup({ getProviderOverview: () => of(OVERVIEW) });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Paragliding');
    expect(text).toContain('CONFIRMED');
  });

  it('shows an empty state when there are no activities', async () => {
    const fixture = await setup({ getProviderOverview: () => of([]) });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No activities yet');
    expect(text).toContain('No booking data yet');
  });

  it('shows an error message when the request fails', async () => {
    const fixture = await setup({
      getProviderOverview: () => throwError(() => new Error('network error')),
    });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Something went wrong');
  });
});
