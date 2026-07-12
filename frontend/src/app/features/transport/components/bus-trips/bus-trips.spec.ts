import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { BusTrips } from '@app/features/transport/components/bus-trips/bus-trips';
import { TripService } from '@app/features/transport/services/trip.service';
import { ScheduleService } from '@app/features/transport/services/schedule.service';
import { DriverService } from '@app/features/transport/services/driver.service';
import { ConductorService } from '@app/features/transport/services/conductor.service';
import { AuthService } from '@app/core/auth/auth.service';
import { ToastService } from '@app/core/toast/toast.service';
import { TripAssignmentPayload, TripResponse } from '@app/features/transport/services/trip.models';
import { ScheduleResponse } from '@app/features/transport/services/schedule.models';
import { ConductorResponse, DriverResponse } from '@app/features/transport/services/staff.models';

const TRIP: TripResponse = {
  id: 1, scheduleId: 1, routeId: 1, providerId: 101, busId: 1, busNumber: 'KA-01-AB-1234', busName: 'Volvo',
  driverId: null, driverName: null, driverLicense: null, conductorId: null, conductorName: null,
  status: 'SCHEDULED', actualDepartureTime: null, actualArrivalTime: null, delayMinutes: 0, distanceCoveredKm: 0,
  notes: null, createdAt: '', updatedAt: '',
};

const SCHEDULE_SCHEDULED: ScheduleResponse = {
  id: 1,
  bus: { id: 1, busNumber: 'KA-01-AB-1234', busName: 'Volvo', totalSeats: 40, providerId: 101, busType: 'AC_SLEEPER', amenities: [], status: 'ACTIVE', createdAt: '' },
  route: { id: 1, source: 'Bengaluru', destination: 'Goa', distanceKm: 560, durationHours: 10, status: 'ACTIVE', createdAt: '' },
  travelDate: '2026-08-01', departureTime: '20:00', arrivalTime: '06:00', fare: 1200, availableSeats: 40, status: 'SCHEDULED',
};
const SCHEDULE_CANCELLED: ScheduleResponse = { ...SCHEDULE_SCHEDULED, id: 2, status: 'CANCELLED' };

const DRIVER_AVAILABLE: DriverResponse = {
  id: 1, providerId: 101, name: 'Ravi Kumar', licenseNumber: 'KA-DL-001', phone: null, email: null,
  status: 'AVAILABLE', totalTrips: 12, totalDistanceKm: 4300, rating: 4.6, active: true, createdAt: '2026-01-01T00:00:00',
};
const DRIVER_OFF_DUTY: DriverResponse = { ...DRIVER_AVAILABLE, id: 2, status: 'OFF_DUTY' };

const CONDUCTOR_AVAILABLE: ConductorResponse = {
  id: 1, providerId: 101, name: 'Suresh Rao', employeeId: 'EMP-001', phone: null, email: null,
  status: 'AVAILABLE', totalTrips: 8, rating: 4.2, active: true, createdAt: '2026-01-01T00:00:00',
};
const CONDUCTOR_OFF_DUTY: ConductorResponse = { ...CONDUCTOR_AVAILABLE, id: 2, status: 'OFF_DUTY' };

type BusTripsInternal = {
  onScheduleChange: (value: string | null | undefined) => void;
  onDriverChange: (value: string | null | undefined) => void;
  onConductorChange: (value: string | null | undefined) => void;
  onAssignSubmit: (event: Event, notes: string) => void;
  openDelay: (trip: TripResponse) => void;
  confirmDelay: (delayMinutesRaw: string) => void;
  openComplete: (trip: TripResponse) => void;
  confirmComplete: (distanceCoveredKmRaw: string) => void;
  openCancel: (trip: TripResponse) => void;
  confirmCancel: (reason: string) => void;
};

async function setup(
  tripService: Partial<TripService>,
  overrides: {
    scheduleService?: Partial<ScheduleService>;
    driverService?: Partial<DriverService>;
    conductorService?: Partial<ConductorService>;
    toastService?: Partial<ToastService>;
  } = {},
) {
  const toastService = overrides.toastService ?? { success: vi.fn(), error: vi.fn() };
  await TestBed.configureTestingModule({
    imports: [BusTrips],
    providers: [
      { provide: TripService, useValue: { getFleetAvailability: () => of({ providerId: 101, totalBuses: 8, activeBuses: 6, maintenanceBuses: 2, inactiveBuses: 0, availableDrivers: 4, availableConductors: 4, activeTrips: 1, scheduledTrips: 1 }), ...tripService } },
      { provide: ScheduleService, useValue: overrides.scheduleService ?? { listMySchedules: () => of([]) } },
      { provide: DriverService, useValue: overrides.driverService ?? { listDrivers: () => of([]) } },
      { provide: ConductorService, useValue: overrides.conductorService ?? { listConductors: () => of([]) } },
      { provide: AuthService, useValue: { currentUser: () => ({ providerId: 101 }) } },
      { provide: ToastService, useValue: toastService },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(BusTrips);
  fixture.detectChanges();
  return { fixture, toastService };
}

describe('BusTrips', () => {
  it('loads trips without any client-side provider filter', async () => {
    const { fixture } = await setup({ listTrips: () => of([TRIP]) });
    expect(fixture.componentInstance.trips()).toEqual([TRIP]);
  });

  it('exposes exactly the valid transition actions for each status, with ARRIVED including Cancel', async () => {
    const { fixture } = await setup({ listTrips: () => of([TRIP]) });
    expect(fixture.componentInstance.validActions('SCHEDULED')).toEqual(['BOARDING', 'CANCELLED']);
    expect(fixture.componentInstance.validActions('BOARDING')).toEqual(['DEPARTED', 'CANCELLED']);
    expect(fixture.componentInstance.validActions('DEPARTED')).toEqual(['RUNNING', 'DELAYED', 'CANCELLED']);
    expect(fixture.componentInstance.validActions('RUNNING')).toEqual(['DELAYED', 'ARRIVED', 'CANCELLED']);
    expect(fixture.componentInstance.validActions('ARRIVED')).toEqual(['COMPLETED', 'CANCELLED']);
    expect(fixture.componentInstance.validActions('COMPLETED')).toEqual([]);
    expect(fixture.componentInstance.validActions('CANCELLED')).toEqual([]);
  });

  it('surfaces a read error inline without throwing', async () => {
    const { fixture } = await setup({ listTrips: () => throwError(() => new HttpErrorResponse({ status: 500 })) });
    expect(fixture.componentInstance.error()).toBe('Failed to load trips.');
  });

  it('filters assignableSchedules to SCHEDULED and availableDrivers/availableConductors to AVAILABLE', async () => {
    const { fixture } = await setup(
      { listTrips: () => of([]) },
      {
        scheduleService: { listMySchedules: () => of([SCHEDULE_SCHEDULED, SCHEDULE_CANCELLED]) },
        driverService: { listDrivers: () => of([DRIVER_AVAILABLE, DRIVER_OFF_DUTY]) },
        conductorService: { listConductors: () => of([CONDUCTOR_AVAILABLE, CONDUCTOR_OFF_DUTY]) },
      },
    );

    expect(fixture.componentInstance.assignableSchedules()).toEqual([SCHEDULE_SCHEDULED]);
    expect(fixture.componentInstance.availableDrivers()).toEqual([DRIVER_AVAILABLE]);
    expect(fixture.componentInstance.availableConductors()).toEqual([CONDUCTOR_AVAILABLE]);
  });

  it('submitAssignCrew calls TripService.assignTrip with the exact payload and toasts success', async () => {
    const assignTrip = vi.fn().mockReturnValue(of(TRIP));
    const { fixture, toastService } = await setup({ listTrips: () => of([]), assignTrip });

    const payload: TripAssignmentPayload = { scheduleId: 1, driverId: 2, conductorId: 3, notes: 'Handle with care' };
    fixture.componentInstance.submitAssignCrew(payload);

    expect(assignTrip).toHaveBeenCalledWith(payload);
    expect(toastService.success).toHaveBeenCalledWith('Crew assigned successfully.');
  });

  it('onAssignSubmit builds the payload from the selected schedule/driver/conductor and trimmed notes, then submits it', async () => {
    const assignTrip = vi.fn().mockReturnValue(of(TRIP));
    const { fixture } = await setup(
      { listTrips: () => of([]), assignTrip },
      { scheduleService: { listMySchedules: () => of([SCHEDULE_SCHEDULED]) } },
    );
    const internal = fixture.componentInstance as unknown as BusTripsInternal;

    internal.onScheduleChange('1');
    internal.onDriverChange('2');
    internal.onConductorChange('3');
    const fakeEvent = { preventDefault: () => {} } as Event;
    internal.onAssignSubmit(fakeEvent, '  Handle with care  ');

    expect(assignTrip).toHaveBeenCalledWith({ scheduleId: 1, driverId: 2, conductorId: 3, notes: 'Handle with care' });
  });

  it('confirmDelay calls TripService.transitionStatus with DELAYED status and delayMinutes, and toasts success', async () => {
    const transitionStatus = vi.fn().mockReturnValue(of(TRIP));
    const { fixture, toastService } = await setup({ listTrips: () => of([TRIP]), transitionStatus });
    const internal = fixture.componentInstance as unknown as BusTripsInternal;

    internal.openDelay(TRIP);
    internal.confirmDelay('15');

    expect(transitionStatus).toHaveBeenCalledWith(TRIP.id, { status: 'DELAYED', delayMinutes: 15 });
    expect(toastService.success).toHaveBeenCalledWith('Trip status updated.');
  });

  it('confirmComplete calls TripService.transitionStatus with COMPLETED status and distanceCoveredKm, and toasts success', async () => {
    const transitionStatus = vi.fn().mockReturnValue(of(TRIP));
    const { fixture, toastService } = await setup({ listTrips: () => of([TRIP]), transitionStatus });
    const internal = fixture.componentInstance as unknown as BusTripsInternal;

    internal.openComplete(TRIP);
    internal.confirmComplete('320');

    expect(transitionStatus).toHaveBeenCalledWith(TRIP.id, { status: 'COMPLETED', distanceCoveredKm: 320 });
    expect(toastService.success).toHaveBeenCalledWith('Trip status updated.');
  });

  it('confirmCancel calls TripService.transitionStatus with CANCELLED status and a reason when provided', async () => {
    const transitionStatus = vi.fn().mockReturnValue(of(TRIP));
    const { fixture, toastService } = await setup({ listTrips: () => of([TRIP]), transitionStatus });
    const internal = fixture.componentInstance as unknown as BusTripsInternal;

    internal.openCancel(TRIP);
    internal.confirmCancel('Vehicle breakdown');

    expect(transitionStatus).toHaveBeenCalledWith(TRIP.id, { status: 'CANCELLED', reason: 'Vehicle breakdown' });
    expect(toastService.success).toHaveBeenCalledWith('Trip status updated.');
  });

  it('confirmCancel calls TripService.transitionStatus with CANCELLED status and no reason field when none is provided', async () => {
    const transitionStatus = vi.fn().mockReturnValue(of(TRIP));
    const { fixture } = await setup({ listTrips: () => of([TRIP]), transitionStatus });
    const internal = fixture.componentInstance as unknown as BusTripsInternal;

    internal.openCancel(TRIP);
    internal.confirmCancel('');

    expect(transitionStatus).toHaveBeenCalledWith(TRIP.id, { status: 'CANCELLED' });
  });
});
