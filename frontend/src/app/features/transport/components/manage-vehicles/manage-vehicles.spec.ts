import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ManageVehicles } from '@app/features/transport/components/manage-vehicles/manage-vehicles';
import { BusService } from '@app/features/transport/services/bus.service';
import { AuthService } from '@app/core/auth/auth.service';
import { ToastService } from '@app/core/toast/toast.service';
import { BusResponse } from '@app/features/transport/services/bus.models';
import { MaintenanceService } from '@app/features/transport/services/maintenance.service';
import { MaintenanceResponse } from '@app/features/transport/services/maintenance.models';

const BUS: BusResponse = {
  id: 1, busNumber: 'KA-01-AB-1234', busName: 'Volvo Sleeper', totalSeats: 40,
  providerId: 101, busType: 'AC_SLEEPER', amenities: ['WIFI'], status: 'ACTIVE', createdAt: '2026-01-01T00:00:00',
};

const MAINTENANCE_RECORD: MaintenanceResponse = {
  id: 1, busId: 1, busNumber: 'KA-01-AB-1234', maintenanceType: 'OIL_CHANGE', description: null,
  status: 'SCHEDULED', scheduledDate: '2026-08-01', completedDate: null, cost: 0, nextMaintenanceDate: null,
  performedBy: null, createdAt: '2026-07-01T00:00:00',
};

async function setup(
  busService: Partial<BusService>,
  toastService: Partial<ToastService> = {},
  maintenanceService: Partial<MaintenanceService> = {},
) {
  await TestBed.configureTestingModule({
    imports: [ManageVehicles],
    providers: [
      { provide: BusService, useValue: busService },
      {
        provide: MaintenanceService,
        useValue: { listMaintenance: vi.fn().mockReturnValue(of([])), ...maintenanceService },
      },
      { provide: AuthService, useValue: { currentUser: () => ({ providerId: 101 }) } },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn(), ...toastService } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ManageVehicles);
  fixture.detectChanges();
  return { fixture };
}

describe('ManageVehicles', () => {
  it('loads the authenticated provider\'s own fleet using StoredUser.providerId as the read filter', async () => {
    const listBuses = vi.fn().mockReturnValue(of([BUS]));
    const { fixture } = await setup({ listBuses });
    expect(listBuses).toHaveBeenCalledWith(101);
    expect(fixture.componentInstance.buses()).toEqual([BUS]);
  });

  it('surfaces a read error inline without throwing', async () => {
    const { fixture } = await setup({
      listBuses: () => throwError(() => new HttpErrorResponse({ status: 500 })),
    });
    expect(fixture.componentInstance.error()).toBe('Failed to load fleet.');
  });

  it('toasts success and reloads the fleet after creating a bus', async () => {
    const listBuses = vi.fn().mockReturnValue(of([BUS]));
    const createBus = vi.fn().mockReturnValue(of(BUS));
    const success = vi.fn();
    const { fixture } = await setup({ listBuses, createBus }, { success });

    fixture.componentInstance.submitCreate({
      busNumber: 'KA-02-CD-5678', busName: 'Scania AC Seater', totalSeats: 45, busType: 'AC_SEATER', amenities: [],
    });

    expect(createBus).toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith('Bus created successfully.');
    expect(listBuses).toHaveBeenCalledTimes(2);
  });

  it('toasts an error message when bus creation fails', async () => {
    const listBuses = vi.fn().mockReturnValue(of([BUS]));
    const createBus = vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { error: { message: 'Invalid bus data' } } })));
    const error = vi.fn();
    const { fixture } = await setup({ listBuses, createBus }, { error });

    fixture.componentInstance.submitCreate({
      busNumber: 'KA-02-CD-5678', busName: 'Scania AC Seater', totalSeats: 45, busType: 'AC_SEATER', amenities: [],
    });

    expect(error).toHaveBeenCalledWith('Invalid bus data');
  });
});

describe('ManageVehicles — Maintenance tab', () => {
  it('exposes only the transition actions valid for the record\'s current status', async () => {
    const listBuses = vi.fn().mockReturnValue(of([]));
    const listMaintenance = vi.fn().mockReturnValue(of([MAINTENANCE_RECORD]));
    await TestBed.configureTestingModule({
      imports: [ManageVehicles],
      providers: [
        { provide: BusService, useValue: { listBuses } },
        { provide: MaintenanceService, useValue: { listMaintenance } },
        { provide: AuthService, useValue: { currentUser: () => ({ providerId: 101 }) } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ManageVehicles);
    fixture.detectChanges();

    expect(fixture.componentInstance.validActions('SCHEDULED')).toEqual(['START', 'CANCEL']);
    expect(fixture.componentInstance.validActions('IN_PROGRESS')).toEqual(['COMPLETE', 'CANCEL']);
    expect(fixture.componentInstance.validActions('COMPLETED')).toEqual([]);
    expect(fixture.componentInstance.validActions('CANCELLED')).toEqual([]);
  });

  it('calls transitionStatus with the exact CANCELLED payload when cancelling a maintenance record', async () => {
    const listBuses = vi.fn().mockReturnValue(of([]));
    const transitionStatus = vi.fn().mockReturnValue(of(MAINTENANCE_RECORD));
    const success = vi.fn();
    const { fixture } = await setup({ listBuses }, { success }, { transitionStatus });

    fixture.componentInstance.transitionMaintenance(1, { status: 'CANCELLED' });

    expect(transitionStatus).toHaveBeenCalledWith(1, { status: 'CANCELLED' });
    expect(success).toHaveBeenCalledWith('Maintenance status updated.');
  });

  it('calls transitionStatus with the dialog-collected cost and completedDate when completing a maintenance record', async () => {
    const listBuses = vi.fn().mockReturnValue(of([]));
    const transitionStatus = vi.fn().mockReturnValue(of(MAINTENANCE_RECORD));
    const success = vi.fn();
    const { fixture } = await setup({ listBuses }, { success }, { transitionStatus });

    fixture.componentInstance.completeTarget.set(MAINTENANCE_RECORD);
    fixture.componentInstance.confirmComplete('1500', '2026-08-05');

    expect(transitionStatus).toHaveBeenCalledWith(1, { status: 'COMPLETED', cost: 1500, completedDate: '2026-08-05' });
    expect(success).toHaveBeenCalledWith('Maintenance status updated.');
    expect(fixture.componentInstance.completeTarget()).toBeNull();
  });
});
