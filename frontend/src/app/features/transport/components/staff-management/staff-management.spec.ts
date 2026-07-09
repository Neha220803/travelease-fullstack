import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { StaffManagement } from '@app/features/transport/components/staff-management/staff-management';
import { DriverService } from '@app/features/transport/services/driver.service';
import { ConductorService } from '@app/features/transport/services/conductor.service';
import { ToastService } from '@app/core/toast/toast.service';
import { DRIVER_STATUSES } from '@app/features/transport/services/transport-enums';
import { ConductorResponse, DriverResponse } from '@app/features/transport/services/staff.models';

const ACTIVE_DRIVER: DriverResponse = {
  id: 1, providerId: 101, name: 'Ravi Kumar', licenseNumber: 'KA-DL-001', phone: null, email: null,
  status: 'AVAILABLE', totalTrips: 12, totalDistanceKm: 4300, rating: 4.6, active: true, createdAt: '2026-01-01T00:00:00',
};
const INACTIVE_DRIVER: DriverResponse = { ...ACTIVE_DRIVER, id: 2, active: false, status: 'OFF_DUTY' };

const ACTIVE_CONDUCTOR: ConductorResponse = {
  id: 1, providerId: 101, name: 'Suresh Rao', employeeId: 'EMP-001', phone: null, email: null,
  status: 'AVAILABLE', totalTrips: 8, rating: 4.2, active: true, createdAt: '2026-01-01T00:00:00',
};

async function setup(driverService: Partial<DriverService>, conductorService: Partial<ConductorService> = {}) {
  const toastSuccess = vi.fn();
  const toastError = vi.fn();
  await TestBed.configureTestingModule({
    imports: [StaffManagement],
    providers: [
      { provide: DriverService, useValue: driverService },
      { provide: ConductorService, useValue: { listConductors: () => of([]), ...conductorService } },
      { provide: ToastService, useValue: { success: toastSuccess, error: toastError } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(StaffManagement);
  fixture.detectChanges();
  return { fixture, toastSuccess, toastError };
}

describe('StaffManagement', () => {
  it('loads drivers and conductors on init', async () => {
    const { fixture } = await setup({ listDrivers: () => of([ACTIVE_DRIVER]) });
    expect(fixture.componentInstance.drivers()).toEqual([ACTIVE_DRIVER]);
  });

  it('marks deactivate as disabled for an already-inactive driver', async () => {
    const { fixture } = await setup({ listDrivers: () => of([ACTIVE_DRIVER, INACTIVE_DRIVER]) });
    expect(fixture.componentInstance.canDeactivate(ACTIVE_DRIVER)).toBe(true);
    expect(fixture.componentInstance.canDeactivate(INACTIVE_DRIVER)).toBe(false);
  });

  it('surfaces a read error inline without throwing', async () => {
    const { fixture } = await setup({
      listDrivers: () => throwError(() => new HttpErrorResponse({ status: 500 })),
    });
    expect(fixture.componentInstance.driversError()).toBe('Failed to load drivers.');
  });

  it('exposes all 5 DRIVER_STATUSES with no artificial restriction on the status select', async () => {
    const { fixture } = await setup({ listDrivers: () => of([]) });
    expect(fixture.componentInstance.driverStatuses).toEqual(DRIVER_STATUSES);
    expect(fixture.componentInstance.driverStatuses.length).toBe(5);
  });

  it('submitCreateDriver calls DriverService.createDriver with the expected payload and toasts success', async () => {
    const createDriver = vi.fn().mockReturnValue(of(ACTIVE_DRIVER));
    const { fixture, toastSuccess } = await setup({ listDrivers: () => of([]), createDriver });

    const payload = { name: 'Ravi Kumar', licenseNumber: 'KA-DL-001' };
    fixture.componentInstance.submitCreateDriver(payload);

    expect(createDriver).toHaveBeenCalledWith(payload);
    expect(toastSuccess).toHaveBeenCalledWith('Driver added successfully.');
  });

  it('submitEditDriver calls DriverService.updateDriver with the expected payload (including status) and toasts success', async () => {
    const updateDriver = vi.fn().mockReturnValue(of(ACTIVE_DRIVER));
    const { fixture, toastSuccess } = await setup({ listDrivers: () => of([ACTIVE_DRIVER]), updateDriver });

    const payload = { name: 'Ravi Kumar', status: 'ASSIGNED' as const, phone: '9999999999' };
    fixture.componentInstance.submitEditDriver(ACTIVE_DRIVER.id, payload);

    expect(updateDriver).toHaveBeenCalledWith(ACTIVE_DRIVER.id, payload);
    expect(toastSuccess).toHaveBeenCalledWith('Driver updated successfully.');
  });

  it('deactivateDriver calls DriverService.deactivateDriver with the id and toasts success', async () => {
    const deactivateDriver = vi.fn().mockReturnValue(of(undefined));
    const { fixture, toastSuccess } = await setup({ listDrivers: () => of([ACTIVE_DRIVER]), deactivateDriver });

    fixture.componentInstance.deactivateDriver(ACTIVE_DRIVER.id);

    expect(deactivateDriver).toHaveBeenCalledWith(ACTIVE_DRIVER.id);
    expect(toastSuccess).toHaveBeenCalledWith('Driver deactivated.');
  });

  it('submitCreateConductor calls ConductorService.createConductor with the expected payload and toasts success', async () => {
    const createConductor = vi.fn().mockReturnValue(of(ACTIVE_CONDUCTOR));
    const { fixture, toastSuccess } = await setup(
      { listDrivers: () => of([]) },
      { listConductors: () => of([]), createConductor },
    );

    const payload = { name: 'Suresh Rao', employeeId: 'EMP-001' };
    fixture.componentInstance.submitCreateConductor(payload);

    expect(createConductor).toHaveBeenCalledWith(payload);
    expect(toastSuccess).toHaveBeenCalledWith('Conductor added successfully.');
  });

  it('submitEditConductor calls ConductorService.updateConductor with the expected payload (including status) and toasts success', async () => {
    const updateConductor = vi.fn().mockReturnValue(of(ACTIVE_CONDUCTOR));
    const { fixture, toastSuccess } = await setup(
      { listDrivers: () => of([]) },
      { listConductors: () => of([ACTIVE_CONDUCTOR]), updateConductor },
    );

    const payload = { name: 'Suresh Rao', status: 'ON_TRIP' as const, email: 'suresh@example.com' };
    fixture.componentInstance.submitEditConductor(ACTIVE_CONDUCTOR.id, payload);

    expect(updateConductor).toHaveBeenCalledWith(ACTIVE_CONDUCTOR.id, payload);
    expect(toastSuccess).toHaveBeenCalledWith('Conductor updated successfully.');
  });

  it('deactivateConductor calls ConductorService.deactivateConductor with the id and toasts success', async () => {
    const deactivateConductor = vi.fn().mockReturnValue(of(undefined));
    const { fixture, toastSuccess } = await setup(
      { listDrivers: () => of([]) },
      { listConductors: () => of([ACTIVE_CONDUCTOR]), deactivateConductor },
    );

    fixture.componentInstance.deactivateConductor(ACTIVE_CONDUCTOR.id);

    expect(deactivateConductor).toHaveBeenCalledWith(ACTIVE_CONDUCTOR.id);
    expect(toastSuccess).toHaveBeenCalledWith('Conductor deactivated.');
  });
});
