import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { BrnSheetContent } from '@spartan-ng/brain/sheet';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { AuthService } from '@app/core/auth/auth.service';
import { ToastService } from '@app/core/toast/toast.service';
import { StaffService } from '@app/features/transport/services/staff.service';
import { STAFF_STATUSES, STAFF_TYPES, StaffStatus, StaffType } from '@app/features/transport/services/transport-enums';
import { StaffCreatePayload, StaffEditPayload, StaffResponse } from '@app/features/transport/services/staff.models';

@Component({
  selector: 'app-staff-management',
  imports: [
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
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
  private readonly staffService = inject(StaffService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  public readonly staffTypes = STAFF_TYPES;
  public readonly staffStatuses = STAFF_STATUSES;

  public readonly staff = signal<StaffResponse[]>([]);
  public readonly staffLoading = signal(true);
  public readonly staffError = signal<string | null>(null);
  public readonly staffSheetOpen = signal(false);
  public readonly editingStaff = signal<StaffResponse | null>(null);
  protected readonly selectedStaffType = signal<StaffType>(STAFF_TYPES[0]);
  protected readonly selectedStaffStatus = signal<StaffStatus>(STAFF_STATUSES[0]);
  protected readonly staffSubmitting = signal(false);
  protected readonly staffFormError = signal<string | null>(null);

  constructor() {
    this.loadStaff();
  }

  loadStaff(): void {
    this.staffLoading.set(true);
    this.staffError.set(null);
    this.staffService.listStaff().subscribe({
      next: (staff) => {
        this.staff.set(staff);
        this.staffLoading.set(false);
      },
      error: () => {
        this.staffError.set('Failed to load staff.');
        this.staffLoading.set(false);
      },
    });
  }

  canDeactivate(person: { active: boolean }): boolean {
    return person.active;
  }

  identifier(person: StaffResponse): string {
    return person.staffType === 'DRIVER' ? (person.licenseNumber ?? '—') : (person.employeeId ?? '—');
  }

  protected openCreateStaff(): void {
    this.editingStaff.set(null);
    this.selectedStaffType.set(STAFF_TYPES[0]);
    this.selectedStaffStatus.set(STAFF_STATUSES[0]);
    this.staffFormError.set(null);
    this.staffSheetOpen.set(true);
  }

  protected openEditStaff(person: StaffResponse): void {
    this.editingStaff.set(person);
    this.selectedStaffType.set(person.staffType);
    this.selectedStaffStatus.set(person.status);
    this.staffFormError.set(null);
    this.staffSheetOpen.set(true);
  }

  protected onStaffSheetStateChanged(state: 'open' | 'closed'): void {
    this.staffSheetOpen.set(state === 'open');
  }

  protected onStaffTypeChange(value: string | null | undefined): void {
    if (value) {
      this.selectedStaffType.set(value as StaffType);
    }
  }

  protected onStaffStatusChange(value: string | null | undefined): void {
    if (value) {
      this.selectedStaffStatus.set(value as StaffStatus);
    }
  }

  protected onStaffSubmit(
    event: Event,
    name: string,
    licenseNumber: string,
    employeeId: string,
    phone: string,
    email: string,
  ): void {
    event.preventDefault();
    this.staffFormError.set(null);

    if (!name.trim()) {
      this.staffFormError.set('Name is required.');
      return;
    }

    const editing = this.editingStaff();
    if (editing) {
      const payload: StaffEditPayload = {
        name,
        status: this.selectedStaffStatus(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
      };
      this.submitEditStaff(editing.id, payload);
    } else {
      const staffType = this.selectedStaffType();
      if (staffType === 'DRIVER' && !licenseNumber.trim()) {
        this.staffFormError.set('License number is required for drivers.');
        return;
      }
      if (staffType !== 'DRIVER' && !employeeId.trim()) {
        this.staffFormError.set('Employee ID is required.');
        return;
      }
      const payload: StaffCreatePayload = {
        name,
        staffType,
        ...(staffType === 'DRIVER' ? { licenseNumber } : { employeeId }),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
      };
      this.submitCreateStaff(payload);
    }
  }

  submitCreateStaff(payload: StaffCreatePayload): void {
    const providerId = this.authService.currentUser()?.providerId;
    if (providerId == null) {
      this.staffSubmitting.set(false);
      this.toastService.error('No provider account found for the current session.');
      return;
    }
    this.staffSubmitting.set(true);
    this.staffService.createStaff(payload, providerId).subscribe({
      next: () => {
        this.staffSubmitting.set(false);
        this.toastService.success('Staff member added successfully.');
        this.staffSheetOpen.set(false);
        this.loadStaff();
      },
      error: (err: HttpErrorResponse) => {
        this.staffSubmitting.set(false);
        const message = err.error?.error?.message ?? 'Failed to add staff member.';
        this.staffFormError.set(message);
        this.toastService.error(message);
      },
    });
  }

  submitEditStaff(id: number, payload: StaffEditPayload): void {
    const providerId = this.authService.currentUser()?.providerId;
    if (providerId == null) {
      this.staffSubmitting.set(false);
      this.toastService.error('No provider account found for the current session.');
      return;
    }
    this.staffSubmitting.set(true);
    this.staffService.updateStaff(id, payload, providerId).subscribe({
      next: () => {
        this.staffSubmitting.set(false);
        this.toastService.success('Staff member updated successfully.');
        this.staffSheetOpen.set(false);
        this.loadStaff();
      },
      error: (err: HttpErrorResponse) => {
        this.staffSubmitting.set(false);
        const message = err.error?.error?.message ?? 'Failed to update staff member.';
        this.staffFormError.set(message);
        this.toastService.error(message);
      },
    });
  }

  deactivateStaff(id: number): void {
    this.staffService.deactivateStaff(id).subscribe({
      next: () => {
        this.toastService.success('Staff member deactivated.');
        this.loadStaff();
      },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to deactivate staff member.'),
    });
  }
}
