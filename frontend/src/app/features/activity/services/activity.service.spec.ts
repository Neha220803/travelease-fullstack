import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivityService } from '@app/features/activity/services/activity.service';
import {
  Activity,
  ActivityBooking,
  ActivityPayload,
  ActivitySlot,
  ActivitySlotPayload,
} from '@app/features/activity/services/activity.models';

const SAMPLE_ACTIVITY: Activity = {
  activityId: 'act-1',
  providerId: 7,
  destinationId: 3,
  activityName: 'Paragliding',
  durationHours: 1,
  startTime: '09:00',
  endTime: '10:00',
  description: 'Coastal paragliding session',
};

const SAMPLE_SLOT: ActivitySlot = {
  activitySlotId: 'slot-1',
  activityId: 'act-1',
  activityDate: '2026-07-20',
  startTime: '09:00',
  endTime: '10:00',
  price: 2500,
  capacity: 10,
  remainingCapacity: 6,
};

const SAMPLE_BOOKING: ActivityBooking = {
  bookingId: 'booking-1',
  activitySlotId: 'slot-1',
  activityId: 'act-1',
  activityName: 'Paragliding',
  activityDate: '2026-07-20',
  startTime: '09:00',
  endTime: '10:00',
  participantCount: 2,
  pricePerParticipant: 2500,
  totalAmount: 5000,
  status: 'CONFIRMED',
  bookedAt: '2026-07-08T10:00:00Z',
  bookedByUserId: 'user-1',
};

describe('ActivityService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return {
      service: TestBed.inject(ActivityService),
      httpMock: TestBed.inject(HttpTestingController),
    };
  }

  it('fetches and unwraps the activity list', async () => {
    const { service, httpMock } = await setup();

    let result: Activity[] | undefined;
    service.listActivities().subscribe((activities) => (result = activities));

    const req = httpMock.expectOne('http://localhost:8080/api/activity-provider/activities');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [SAMPLE_ACTIVITY], message: 'ok', error: null });

    expect(result).toEqual([SAMPLE_ACTIVITY]);
  });

  it('creates an activity', async () => {
    const { service, httpMock } = await setup();

    const payload: ActivityPayload = {
      destinationId: 3,
      activityName: 'Paragliding',
      durationHours: 1,
      startTime: '09:00',
      endTime: '10:00',
      description: 'Coastal paragliding session',
    };

    let result: Activity | undefined;
    service.createActivity(payload).subscribe((activity) => (result = activity));

    const req = httpMock.expectOne('http://localhost:8080/api/activity-provider/activities');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true, data: SAMPLE_ACTIVITY, message: 'ok', error: null });

    expect(result).toEqual(SAMPLE_ACTIVITY);
  });

  it('updates an activity', async () => {
    const { service, httpMock } = await setup();

    const payload: ActivityPayload = {
      destinationId: 3,
      activityName: 'Paragliding Deluxe',
      durationHours: 1.5,
      startTime: '09:00',
      endTime: '10:30',
      description: 'Updated',
    };

    let result: Activity | undefined;
    service.updateActivity('act-1', payload).subscribe((activity) => (result = activity));

    const req = httpMock.expectOne('http://localhost:8080/api/activity-provider/activities/act-1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({
      success: true,
      data: { ...SAMPLE_ACTIVITY, activityName: 'Paragliding Deluxe' },
      message: 'ok',
      error: null,
    });

    expect(result?.activityName).toBe('Paragliding Deluxe');
  });

  it('fetches slots for an activity', async () => {
    const { service, httpMock } = await setup();

    let result: ActivitySlot[] | undefined;
    service.listSlots('act-1').subscribe((slots) => (result = slots));

    const req = httpMock.expectOne(
      'http://localhost:8080/api/activity-provider/activities/act-1/slots',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [SAMPLE_SLOT], message: 'ok', error: null });

    expect(result).toEqual([SAMPLE_SLOT]);
  });

  it('creates a slot', async () => {
    const { service, httpMock } = await setup();

    const payload: ActivitySlotPayload = {
      activityDate: '2026-07-20',
      startTime: '09:00',
      endTime: '10:00',
      price: 2500,
      capacity: 10,
    };

    let result: ActivitySlot | undefined;
    service.createSlot('act-1', payload).subscribe((slot) => (result = slot));

    const req = httpMock.expectOne(
      'http://localhost:8080/api/activity-provider/activities/act-1/slots',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true, data: SAMPLE_SLOT, message: 'ok', error: null });

    expect(result).toEqual(SAMPLE_SLOT);
  });

  it('updates a slot', async () => {
    const { service, httpMock } = await setup();

    const payload: ActivitySlotPayload = {
      activityDate: '2026-07-20',
      startTime: '09:00',
      endTime: '10:00',
      price: 3000,
      capacity: 12,
    };

    let result: ActivitySlot | undefined;
    service.updateSlot('act-1', 'slot-1', payload).subscribe((slot) => (result = slot));

    const req = httpMock.expectOne(
      'http://localhost:8080/api/activity-provider/activities/act-1/slots/slot-1',
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({
      success: true,
      data: { ...SAMPLE_SLOT, price: 3000, capacity: 12 },
      message: 'ok',
      error: null,
    });

    expect(result?.price).toBe(3000);
  });

  it('fetches bookings for an activity', async () => {
    const { service, httpMock } = await setup();

    let result: ActivityBooking[] | undefined;
    service.listBookingsForActivity('act-1').subscribe((bookings) => (result = bookings));

    const req = httpMock.expectOne(
      'http://localhost:8080/api/activity-provider/activities/act-1/bookings',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [SAMPLE_BOOKING], message: 'ok', error: null });

    expect(result).toEqual([SAMPLE_BOOKING]);
  });

  it('fetches a single booking', async () => {
    const { service, httpMock } = await setup();

    let result: ActivityBooking | undefined;
    service.getBooking('booking-1').subscribe((booking) => (result = booking));

    const req = httpMock.expectOne('http://localhost:8080/api/activity-provider/bookings/booking-1');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: SAMPLE_BOOKING, message: 'ok', error: null });

    expect(result).toEqual(SAMPLE_BOOKING);
  });

  it('marks attendance for a booking', async () => {
    const { service, httpMock } = await setup();

    let result: ActivityBooking | undefined;
    service.markAttendance('booking-1', 'ATTENDED').subscribe((booking) => (result = booking));

    const req = httpMock.expectOne(
      'http://localhost:8080/api/activity-provider/bookings/booking-1/attendance',
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'ATTENDED' });
    req.flush({
      success: true,
      data: { ...SAMPLE_BOOKING, status: 'ATTENDED' },
      message: 'ok',
      error: null,
    });

    expect(result?.status).toBe('ATTENDED');
  });

  it('builds a provider overview by joining activities with their slots and bookings', async () => {
    const { service, httpMock } = await setup();

    let result: unknown;
    service.getProviderOverview().subscribe((overview) => (result = overview));

    httpMock
      .expectOne('http://localhost:8080/api/activity-provider/activities')
      .flush({ success: true, data: [SAMPLE_ACTIVITY], message: 'ok', error: null });

    httpMock
      .expectOne('http://localhost:8080/api/activity-provider/activities/act-1/slots')
      .flush({ success: true, data: [SAMPLE_SLOT], message: 'ok', error: null });

    httpMock
      .expectOne('http://localhost:8080/api/activity-provider/activities/act-1/bookings')
      .flush({ success: true, data: [SAMPLE_BOOKING], message: 'ok', error: null });

    expect(result).toEqual([
      { activity: SAMPLE_ACTIVITY, slots: [SAMPLE_SLOT], bookings: [SAMPLE_BOOKING] },
    ]);
  });

  it('returns an empty overview without any HTTP calls when there are no activities', async () => {
    const { service, httpMock } = await setup();

    let result: unknown;
    service.getProviderOverview().subscribe((overview) => (result = overview));

    httpMock
      .expectOne('http://localhost:8080/api/activity-provider/activities')
      .flush({ success: true, data: [], message: 'ok', error: null });

    expect(result).toEqual([]);
    httpMock.verify();
  });
});
