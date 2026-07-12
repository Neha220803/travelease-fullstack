import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { StaffManagement } from '@app/features/transport/components/staff-management/staff-management';
import { StaffService } from '@app/features/transport/services/staff.service';
import { AuthService } from '@app/core/auth/auth.service';
import { ToastService } from '@app/core/toast/toast.service';
import { STAFF_STATUSES } from '@app/features/transport/services/transport-enums';
import { StaffResponse } from '@app/features/transport/services/staff.models';

const ACTIVE_DRIVER: StaffResponse = {
  id: 1, providerId: 101, name: 'Ravi Kumar', staffType: 'DRIVER', licenseNumber: 'KA-DL-001', employeeId: null,
  phone: null, email: null, status: 'AVAILABLE', totalTrips: 12, totalDistanceKm: 4300, rating: 4.6, active: true,
  createdAt: '2026-01-01T00:00:00',
};
const INACTIVE_DRIVER: StaffResponse = { ...ACTIVE_DRIVER, id: 2, active: false, status: 'OFF_DUTY' };

const ACTIVE_CONDUCTOR: StaffResponse = {
  id: 3, providerId: 101, name: 'Suresh Rao', staffType: 'CONDUCTOR', licenseNumber: null, employeeId: 'EMP-001',
  phone: null, email: null, status: 'AVAILABLE', totalTrips: 8, totalDistanceKm: 0, rating: 4.2, active: true,
  createdAt: '2026-01-01T00:00:00',
};

async function setup(staffService: Partial<StaffService>) {
  const toastSuccess = vi.fn();
  const toastError = vi.fn();
  await TestBed.configureTestingModule({
    imports: [StaffManagement],
    providers: [
      { provide: StaffService, useValue: staffService },
      { provide: AuthService, useValue: { currentUser: () => ({ providerId: 101 }) } },
      { provide: ToastService, useValue: { success: toastSuccess, error: toastError } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(StaffManagement);
  fixture.detectChanges();
  return { fixture, toastSuccess, toastError };
}

describe('StaffManagement', () => {
  it('loads staff on init', async () => {
    const { fixture } = await setup({ listStaff: () => of([ACTIVE_DRIVER, ACTIVE_CONDUCTOR]) });
    expect(fixture.componentInstance.staff()).toEqual([ACTIVE_DRIVER, ACTIVE_CONDUCTOR]);
  });

  it('marks deactivate as disabled for an already-inactive staff member', async () => {
    const { fixture } = await setup({ listStaff: () => of([ACTIVE_DRIVER, INACTIVE_DRIVER]) });
    expect(fixture.componentInstance.canDeactivate(ACTIVE_DRIVER)).toBe(true);
    expect(fixture.componentInstance.canDeactivate(INACTIVE_DRIVER)).toBe(false);
  });

  it('surfaces a read error inline without throwing', async () => {
    const { fixture } = await setup({ listStaff: () => throwError(() => new HttpErrorResponse({ status: 500 })) });
    expect(fixture.componentInstance.staffError()).toBe('Failed to load staff.');
  });

  it('exposes all 5 STAFF_STATUSES with no artificial restriction on the status select', async () => {
    const { fixture } = await setup({ listStaff: () => of([]) });
    expect(fixture.componentInstance.staffStatuses).toEqual(STAFF_STATUSES);
    expect(fixture.componentInstance.staffStatuses.length).toBe(5);
  });

  it('identifier() shows licenseNumber for drivers and employeeId for other staff types', async () => {
    const { fixture } = await setup({ listStaff: () => of([]) });
    expect(fixture.componentInstance.identifier(ACTIVE_DRIVER)).toBe('KA-DL-001');
    expect(fixture.componentInstance.identifier(ACTIVE_CONDUCTOR)).toBe('EMP-001');
  });

  it('submitCreateStaff calls StaffService.createStaff with the expected payload and toasts success', async () => {
    const createStaff = vi.fn().mockReturnValue(of(ACTIVE_DRIVER));
    const { fixture, toastSuccess } = await setup({ listStaff: () => of([]), createStaff });

    const payload = { name: 'Ravi Kumar', staffType: 'DRIVER' as const, licenseNumber: 'KA-DL-001' };
    fixture.componentInstance.submitCreateStaff(payload);

    // Regression guard: StaffRequest.providerId is validated (not
    // discarded) server-side against the caller's own id — must send the
    // real providerId (101 from the mocked AuthService), not a placeholder.
    expect(createStaff).toHaveBeenCalledWith(payload, 101);
    expect(toastSuccess).toHaveBeenCalledWith('Staff member added successfully.');
  });

  it('submitEditStaff calls StaffService.updateStaff with the expected payload (including status) and toasts success', async () => {
    const updateStaff = vi.fn().mockReturnValue(of(ACTIVE_DRIVER));
    const { fixture, toastSuccess } = await setup({ listStaff: () => of([ACTIVE_DRIVER]), updateStaff });

    const payload = { name: 'Ravi Kumar', status: 'ASSIGNED' as const, phone: '9999999999' };
    fixture.componentInstance.submitEditStaff(ACTIVE_DRIVER.id, payload);

    expect(updateStaff).toHaveBeenCalledWith(ACTIVE_DRIVER.id, payload, 101);
    expect(toastSuccess).toHaveBeenCalledWith('Staff member updated successfully.');
  });

  it('deactivateStaff calls StaffService.deactivateStaff with the id and toasts success', async () => {
    const deactivateStaff = vi.fn().mockReturnValue(of(undefined));
    const { fixture, toastSuccess } = await setup({ listStaff: () => of([ACTIVE_DRIVER]), deactivateStaff });

    fixture.componentInstance.deactivateStaff(ACTIVE_DRIVER.id);

    expect(deactivateStaff).toHaveBeenCalledWith(ACTIVE_DRIVER.id);
    expect(toastSuccess).toHaveBeenCalledWith('Staff member deactivated.');
  });
});
