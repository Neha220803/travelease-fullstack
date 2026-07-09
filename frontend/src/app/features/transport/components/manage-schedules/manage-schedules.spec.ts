import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ManageSchedules } from '@app/features/transport/components/manage-schedules/manage-schedules';
import { ScheduleService } from '@app/features/transport/services/schedule.service';
import { RouteReferenceService } from '@app/features/transport/services/route-reference.service';
import { BusService } from '@app/features/transport/services/bus.service';
import { AuthService } from '@app/core/auth/auth.service';
import { ToastService } from '@app/core/toast/toast.service';
import { ScheduleFormPayload, ScheduleResponse } from '@app/features/transport/services/schedule.models';
import { BusResponse } from '@app/features/transport/services/bus.models';

const SCHEDULED: ScheduleResponse = {
  id: 1,
  bus: { id: 1, busNumber: 'KA-01-AB-1234', busName: 'Volvo', totalSeats: 40, providerId: 101, busType: 'AC_SLEEPER', amenities: [], status: 'ACTIVE', createdAt: '' },
  route: { id: 1, source: 'Bengaluru', destination: 'Goa', distanceKm: 560, durationHours: 10, status: 'ACTIVE', createdAt: '' },
  travelDate: '2026-08-01', departureTime: '20:00', arrivalTime: '06:00', fare: 1200, availableSeats: 40, status: 'SCHEDULED',
};
const CANCELLED: ScheduleResponse = { ...SCHEDULED, id: 2, status: 'CANCELLED' };

const ACTIVE_BUS: BusResponse = { id: 1, busNumber: 'KA-01-AB-1234', busName: 'Volvo', totalSeats: 40, providerId: 101, busType: 'AC_SLEEPER', amenities: [], status: 'ACTIVE', createdAt: '' };
const INACTIVE_BUS: BusResponse = { id: 2, busNumber: 'KA-01-CD-5678', busName: 'Scania', totalSeats: 36, providerId: 101, busType: 'NON_AC_SEATER', amenities: [], status: 'INACTIVE', createdAt: '' };

async function setup(
  scheduleService: Partial<ScheduleService>,
  overrides: { busService?: Partial<BusService>; toastService?: Partial<ToastService> } = {},
) {
  const toastService = overrides.toastService ?? { success: vi.fn(), error: vi.fn() };
  await TestBed.configureTestingModule({
    imports: [ManageSchedules],
    providers: [
      { provide: ScheduleService, useValue: scheduleService },
      { provide: RouteReferenceService, useValue: { listActiveRoutes: () => of([]) } },
      { provide: BusService, useValue: overrides.busService ?? { listBuses: () => of([]) } },
      { provide: AuthService, useValue: { currentUser: () => ({ providerId: 101 }) } },
      { provide: ToastService, useValue: toastService },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ManageSchedules);
  fixture.detectChanges();
  return { fixture, toastService };
}

describe('ManageSchedules', () => {
  it('loads the caller\'s own schedules via the client-side providerId filter', async () => {
    const { fixture } = await setup({ listMySchedules: () => of([SCHEDULED]) });
    expect(fixture.componentInstance.schedules()).toEqual([SCHEDULED]);
  });

  it('disables Cancel for an already-cancelled schedule', async () => {
    const { fixture } = await setup({ listMySchedules: () => of([SCHEDULED, CANCELLED]) });
    expect(fixture.componentInstance.canCancel(SCHEDULED)).toBe(true);
    expect(fixture.componentInstance.canCancel(CANCELLED)).toBe(false);
  });

  it('surfaces a read error inline without throwing', async () => {
    const { fixture } = await setup({
      listMySchedules: () => throwError(() => new HttpErrorResponse({ status: 500 })),
    });
    expect(fixture.componentInstance.error()).toBe('Failed to load schedules.');
  });

  it('exposes only ACTIVE buses via activeBuses, filtering out INACTIVE ones', async () => {
    const { fixture } = await setup(
      { listMySchedules: () => of([]) },
      { busService: { listBuses: () => of([ACTIVE_BUS, INACTIVE_BUS]) } },
    );
    expect(fixture.componentInstance.activeBuses()).toEqual([ACTIVE_BUS]);
  });

  it('calls ScheduleService.createSchedule with the exact payload and shows a success toast', async () => {
    const createSchedule = vi.fn(() => of(SCHEDULED));
    const { fixture, toastService } = await setup({
      listMySchedules: () => of([]),
      createSchedule,
    });

    const payload: ScheduleFormPayload = {
      busId: 1,
      routeId: 1,
      travelDate: '2026-08-01',
      departureTime: '20:00',
      arrivalTime: '06:00',
      fare: 1200,
    };
    fixture.componentInstance.submitCreate(payload);

    expect(createSchedule).toHaveBeenCalledWith(payload);
    expect(toastService.success).toHaveBeenCalledWith('Schedule created successfully.');
  });

  it('calls ScheduleService.cancelSchedule with the schedule id and shows a success toast', async () => {
    const cancelSchedule = vi.fn(() => of(undefined));
    const { fixture, toastService } = await setup({
      listMySchedules: () => of([]),
      cancelSchedule,
    });

    fixture.componentInstance.cancelSchedule(1);

    expect(cancelSchedule).toHaveBeenCalledWith(1);
    expect(toastService.success).toHaveBeenCalledWith('Schedule cancelled.');
  });
});
