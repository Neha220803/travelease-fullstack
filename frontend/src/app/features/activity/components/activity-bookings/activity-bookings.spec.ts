import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ActivityBookings } from '@app/features/activity/components/activity-bookings/activity-bookings';
import { ActivityService } from '@app/features/activity/services/activity.service';
import { ActivityBooking, ActivityOverview } from '@app/features/activity/services/activity.models';

const CONFIRMED_BOOKING: ActivityBooking = {
  bookingId: 'booking-1',
  activitySlotId: 'slot-1',
  activityId: 'act-1',
  activityName: 'Paragliding',
  activityDate: '2026-07-20',
  startTime: '09:00',
  endTime: '10:00',
  participantCount: 4,
  pricePerParticipant: 2500,
  totalAmount: 10000,
  status: 'CONFIRMED',
  bookedAt: '2026-07-08T09:00:00Z',
  bookedByUserId: 'user-1',
};

const OLDER_BOOKING: ActivityBooking = {
  ...CONFIRMED_BOOKING,
  bookingId: 'booking-0',
  activityName: 'Scuba Diving',
  bookedAt: '2026-07-01T09:00:00Z',
};

const OVERVIEW: ActivityOverview[] = [
  { activity: { activityId: 'act-1', providerId: 1, destinationId: 3, activityName: 'Paragliding', durationHours: 1, startTime: '09:00', endTime: '10:00', description: '' }, slots: [], bookings: [CONFIRMED_BOOKING, OLDER_BOOKING] },
];

async function setup(activityService: Partial<ActivityService>) {
  await TestBed.configureTestingModule({
    imports: [ActivityBookings],
    providers: [{ provide: ActivityService, useValue: activityService }],
  }).compileComponents();
  const fixture = TestBed.createComponent(ActivityBookings);
  fixture.detectChanges();
  return fixture;
}

describe('ActivityBookings', () => {
  it('shows a loading state before bookings arrive', async () => {
    const subject = new Subject<ActivityOverview[]>();
    const fixture = await setup({ getProviderOverview: () => subject.asObservable() });
    expect(fixture.componentInstance.loading()).toBe(true);
  });

  it('renders bookings sorted by most recent first', async () => {
    const fixture = await setup({ getProviderOverview: () => of(OVERVIEW) });
    const c = fixture.componentInstance;
    expect(c.bookings().map((b) => b.bookingId)).toEqual(['booking-1', 'booking-0']);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Paragliding');
    expect(text).toContain('Scuba Diving');
  });

  it('shows an empty state with no bookings', async () => {
    const fixture = await setup({ getProviderOverview: () => of([]) });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No bookings yet');
  });

  it('shows an error message when loading fails', async () => {
    const fixture = await setup({ getProviderOverview: () => throwError(() => new Error('boom')) });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Something went wrong');
  });

  it('marks a booking as attended and updates it in place', async () => {
    const updated: ActivityBooking = { ...CONFIRMED_BOOKING, status: 'ATTENDED' };
    const markAttendance = vi.fn().mockReturnValue(of(updated));
    const fixture = await setup({ getProviderOverview: () => of(OVERVIEW), markAttendance });

    fixture.componentInstance.markAttendance(CONFIRMED_BOOKING, 'ATTENDED');
    fixture.detectChanges();

    expect(markAttendance).toHaveBeenCalledWith('booking-1', 'ATTENDED');
    expect(fixture.componentInstance.bookings().find((b) => b.bookingId === 'booking-1')?.status).toBe('ATTENDED');
  });

  it('surfaces a backend error when marking attendance fails', async () => {
    const markAttendance = vi.fn().mockReturnValue(
      throwError(() => ({ error: { error: { message: 'Attendance cannot be marked before the activity slot starts' } } })),
    );
    const fixture = await setup({ getProviderOverview: () => of(OVERVIEW), markAttendance });

    fixture.componentInstance.markAttendance(CONFIRMED_BOOKING, 'ATTENDED');
    fixture.detectChanges();

    expect(fixture.componentInstance.bookingErrors()['booking-1']).toBe(
      'Attendance cannot be marked before the activity slot starts',
    );
  });
});
