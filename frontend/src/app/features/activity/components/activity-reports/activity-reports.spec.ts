import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  ActivityReports,
  computeRevenueByActivity,
  isRevenueEligible,
} from '@app/features/activity/components/activity-reports/activity-reports';
import { ActivityService } from '@app/features/activity/services/activity.service';
import { ActivityBooking, ActivityOverview } from '@app/features/activity/services/activity.models';

function booking(overrides: Partial<ActivityBooking>): ActivityBooking {
  return {
    bookingId: 'b1',
    activitySlotId: 's1',
    activityId: 'act-1',
    activityName: 'Paragliding',
    activityDate: '2026-07-20',
    startTime: '09:00',
    endTime: '10:00',
    participantCount: 2,
    pricePerParticipant: 2500,
    totalAmount: 5000,
    status: 'CONFIRMED',
    bookedAt: '2026-07-08T09:00:00Z',
    bookedByUserId: 'user-1',
    ...overrides,
  };
}

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

describe('computeRevenueByActivity', () => {
  it('gives the highest-revenue activity a full-width bar and scales the rest proportionally', () => {
    const overview: ActivityOverview[] = [
      {
        activity: { activityId: 'act-1', providerId: 1, destinationId: 3, activityName: 'Paragliding', durationHours: 1, startTime: '09:00', endTime: '10:00', description: '', price: null },
        slots: [],
        bookings: [booking({ totalAmount: 10000 }), booking({ bookingId: 'b2', totalAmount: 5000, status: 'CANCELLED' })],
      },
      {
        activity: { activityId: 'act-2', providerId: 1, destinationId: 3, activityName: 'Scuba Diving', durationHours: 2, startTime: '08:00', endTime: '10:00', description: '', price: null },
        slots: [],
        bookings: [booking({ bookingId: 'b3', activityId: 'act-2', totalAmount: 4000 })],
      },
    ];

    const result = computeRevenueByActivity(overview);
    expect(result).toEqual([
      { id: 'act-1', name: 'Paragliding', revenue: 10000, pct: 100 },
      { id: 'act-2', name: 'Scuba Diving', revenue: 4000, pct: 40 },
    ]);
  });

  it('does not divide by zero when there is no revenue at all', () => {
    const overview: ActivityOverview[] = [
      {
        activity: { activityId: 'act-1', providerId: 1, destinationId: 3, activityName: 'Paragliding', durationHours: 1, startTime: '09:00', endTime: '10:00', description: '', price: null },
        slots: [],
        bookings: [],
      },
    ];
    expect(computeRevenueByActivity(overview)).toEqual([
      { id: 'act-1', name: 'Paragliding', revenue: 0, pct: 0 },
    ]);
  });
});

const OVERVIEW: ActivityOverview[] = [
  {
    activity: { activityId: 'act-1', providerId: 1, destinationId: 3, activityName: 'Paragliding', durationHours: 1, startTime: '09:00', endTime: '10:00', description: '', price: null },
    slots: [],
    bookings: [
      booking({ totalAmount: 10000 }),
      booking({ bookingId: 'b2', status: 'ATTENDED', totalAmount: 5000 }),
      booking({ bookingId: 'b3', status: 'NO_SHOW', totalAmount: 5000 }),
      booking({ bookingId: 'b4', status: 'CANCELLED', totalAmount: 9999 }),
    ],
  },
];

async function setup(activityService: Partial<ActivityService>) {
  await TestBed.configureTestingModule({
    imports: [ActivityReports],
    providers: [{ provide: ActivityService, useValue: activityService }],
  }).compileComponents();
  const fixture = TestBed.createComponent(ActivityReports);
  fixture.detectChanges();
  return fixture;
}

describe('ActivityReports', () => {
  it('computes revenue, booking count, average value and attendance rate excluding cancellations', async () => {
    const fixture = await setup({ getProviderOverview: () => of(OVERVIEW) });
    const c = fixture.componentInstance;

    expect(c.totalRevenue()).toBe(20000);
    expect(c.totalBookings()).toBe(4);
    expect(c.avgBookingValue()).toBe(5000);
    expect(c.attendanceRate()).toBe(50);
  });

  it('shows a dash for attendance rate when nothing has been marked yet', async () => {
    const fixture = await setup({
      getProviderOverview: () => of([{ ...OVERVIEW[0], bookings: [booking({})] }]),
    });
    expect(fixture.componentInstance.attendanceRate()).toBeNull();
  });

  it('shows an error message when loading fails', async () => {
    const fixture = await setup({ getProviderOverview: () => throwError(() => new Error('boom')) });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Something went wrong');
  });
});
