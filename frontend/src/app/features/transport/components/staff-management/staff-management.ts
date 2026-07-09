import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { BrnSheetContent } from '@spartan-ng/brain/sheet';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { ToastService } from '@app/core/toast/toast.service';
import { DriverService } from '@app/features/transport/services/driver.service';
import { ConductorService } from '@app/features/transport/services/conductor.service';
import {
  CONDUCTOR_STATUSES, ConductorStatus, DRIVER_STATUSES, DriverStatus,
} from '@app/features/transport/services/transport-enums';
import {
  ConductorCreatePayload, ConductorEditPayload, ConductorResponse,
  DriverCreatePayload, DriverEditPayload, DriverResponse,
} from '@app/features/transport/services/staff.models';

@Component({
  selector: 'app-staff-management',
  imports: [
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmTabsImports,
    HlmTableImports,
    HlmSheetImports,
    BrnSheetContent,
    HlmInputImports,
    HlmLabelImports,
    HlmSelectImports,
    PageHeader,
    StatusBadge,
  ],
  templateUrl: './staff-management.html',
})
export class StaffManagement {
  private readonly driverService = inject(DriverService);
  private readonly conductorService = inject(ConductorService);
  private readonly toastService = inject(ToastService);

  public readonly driverStatuses = DRIVER_STATUSES;
  public readonly conductorStatuses = CONDUCTOR_STATUSES;

  protected readonly activeTab = signal('drivers');

  public readonly drivers = signal<DriverResponse[]>([]);
  public readonly driversLoading = signal(true);
  public readonly driversError = signal<string | null>(null);
  public readonly driverSheetOpen = signal(false);
  public readonly editingDriver = signal<DriverResponse | null>(null);
  protected readonly selectedDriverStatus = signal<DriverStatus>(DRIVER_STATUSES[0]);
  protected readonly driverSubmitting = signal(false);
  protected readonly driverFormError = signal<string | null>(null);

  public readonly conductors = signal<ConductorResponse[]>([]);
  public readonly conductorsLoading = signal(true);
  public readonly conductorsError = signal<string | null>(null);
  public readonly conductorSheetOpen = signal(false);
  public readonly editingConductor = signal<ConductorResponse | null>(null);
  protected readonly selectedConductorStatus = signal<ConductorStatus>(CONDUCTOR_STATUSES[0]);
  protected readonly conductorSubmitting = signal(false);
  protected readonly conductorFormError = signal<string | null>(null);

  constructor() {
    this.loadDrivers();
    this.loadConductors();
  }

  loadDrivers(): void {
    this.driversLoading.set(true);
    this.driversError.set(null);
    this.driverService.listDrivers().subscribe({
      next: (drivers) => {
        this.drivers.set(drivers);
        this.driversLoading.set(false);
      },
      error: () => {
        this.driversError.set('Failed to load drivers.');
        this.driversLoading.set(false);
      },
    });
  }

  loadConductors(): void {
    this.conductorsLoading.set(true);
    this.conductorsError.set(null);
    this.conductorService.listConductors().subscribe({
      next: (conductors) => {
        this.conductors.set(conductors);
        this.conductorsLoading.set(false);
      },
      error: () => {
        this.conductorsError.set('Failed to load conductors.');
        this.conductorsLoading.set(false);
      },
    });
  }

  canDeactivate(person: { active: boolean }): boolean {
    return person.active;
  }

  protected openCreateDriver(): void {
    this.editingDriver.set(null);
    this.selectedDriverStatus.set(DRIVER_STATUSES[0]);
    this.driverFormError.set(null);
    this.driverSheetOpen.set(true);
  }

  protected openEditDriver(driver: DriverResponse): void {
    this.editingDriver.set(driver);
    this.selectedDriverStatus.set(driver.status);
    this.driverFormError.set(null);
    this.driverSheetOpen.set(true);
  }

  protected onDriverSheetStateChanged(state: 'open' | 'closed'): void {
    this.driverSheetOpen.set(state === 'open');
  }

  protected onDriverStatusChange(value: string | null | undefined): void {
    if (value) {
      this.selectedDriverStatus.set(value as DriverStatus);
    }
  }

  protected onDriverSubmit(event: Event, name: string, licenseNumber: string, phone: string, email: string): void {
    event.preventDefault();
    this.driverFormError.set(null);
    this.driverSubmitting.set(true);

    const editing = this.editingDriver();
    if (editing) {
      const payload: DriverEditPayload = {
        name,
        status: this.selectedDriverStatus(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
      };
      this.submitEditDriver(editing.id, payload);
    } else {
      const payload: DriverCreatePayload = {
        name,
        licenseNumber,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
      };
      this.submitCreateDriver(payload);
    }
  }

  submitCreateDriver(payload: DriverCreatePayload): void {
    this.driverService.createDriver(payload).subscribe({
      next: () => {
        this.driverSubmitting.set(false);
        this.toastService.success('Driver added successfully.');
        this.driverSheetOpen.set(false);
        this.loadDrivers();
      },
      error: (err: HttpErrorResponse) => {
        this.driverSubmitting.set(false);
        const message = err.error?.error?.message ?? 'Failed to add driver.';
        this.driverFormError.set(message);
        this.toastService.error(message);
      },
    });
  }

  submitEditDriver(id: number, payload: DriverEditPayload): void {
    this.driverService.updateDriver(id, payload).subscribe({
      next: () => {
        this.driverSubmitting.set(false);
        this.toastService.success('Driver updated successfully.');
        this.driverSheetOpen.set(false);
        this.loadDrivers();
      },
      error: (err: HttpErrorResponse) => {
        this.driverSubmitting.set(false);
        const message = err.error?.error?.message ?? 'Failed to update driver.';
        this.driverFormError.set(message);
        this.toastService.error(message);
      },
    });
  }

  deactivateDriver(id: number): void {
    this.driverService.deactivateDriver(id).subscribe({
      next: () => {
        this.toastService.success('Driver deactivated.');
        this.loadDrivers();
      },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to deactivate driver.'),
    });
  }

  protected openCreateConductor(): void {
    this.editingConductor.set(null);
    this.selectedConductorStatus.set(CONDUCTOR_STATUSES[0]);
    this.conductorFormError.set(null);
    this.conductorSheetOpen.set(true);
  }

  protected openEditConductor(conductor: ConductorResponse): void {
    this.editingConductor.set(conductor);
    this.selectedConductorStatus.set(conductor.status);
    this.conductorFormError.set(null);
    this.conductorSheetOpen.set(true);
  }

  protected onConductorSheetStateChanged(state: 'open' | 'closed'): void {
    this.conductorSheetOpen.set(state === 'open');
  }

  protected onConductorStatusChange(value: string | null | undefined): void {
    if (value) {
      this.selectedConductorStatus.set(value as ConductorStatus);
    }
  }

  protected onConductorSubmit(event: Event, name: string, employeeId: string, phone: string, email: string): void {
    event.preventDefault();
    this.conductorFormError.set(null);
    this.conductorSubmitting.set(true);

    const editing = this.editingConductor();
    if (editing) {
      const payload: ConductorEditPayload = {
        name,
        status: this.selectedConductorStatus(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
      };
      this.submitEditConductor(editing.id, payload);
    } else {
      const payload: ConductorCreatePayload = {
        name,
        employeeId,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
      };
      this.submitCreateConductor(payload);
    }
  }

  submitCreateConductor(payload: ConductorCreatePayload): void {
    this.conductorService.createConductor(payload).subscribe({
      next: () => {
        this.conductorSubmitting.set(false);
        this.toastService.success('Conductor added successfully.');
        this.conductorSheetOpen.set(false);
        this.loadConductors();
      },
      error: (err: HttpErrorResponse) => {
        this.conductorSubmitting.set(false);
        const message = err.error?.error?.message ?? 'Failed to add conductor.';
        this.conductorFormError.set(message);
        this.toastService.error(message);
      },
    });
  }

  submitEditConductor(id: number, payload: ConductorEditPayload): void {
    this.conductorService.updateConductor(id, payload).subscribe({
      next: () => {
        this.conductorSubmitting.set(false);
        this.toastService.success('Conductor updated successfully.');
        this.conductorSheetOpen.set(false);
        this.loadConductors();
      },
      error: (err: HttpErrorResponse) => {
        this.conductorSubmitting.set(false);
        const message = err.error?.error?.message ?? 'Failed to update conductor.';
        this.conductorFormError.set(message);
        this.toastService.error(message);
      },
    });
  }

  deactivateConductor(id: number): void {
    this.conductorService.deactivateConductor(id).subscribe({
      next: () => {
        this.toastService.success('Conductor deactivated.');
        this.loadConductors();
      },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to deactivate conductor.'),
    });
  }
}
