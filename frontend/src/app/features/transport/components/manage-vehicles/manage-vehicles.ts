import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { BrnSheetContent } from '@spartan-ng/brain/sheet';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { BrnAlertDialogContent } from '@spartan-ng/brain/alert-dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { AuthService } from '@app/core/auth/auth.service';
import { ToastService } from '@app/core/toast/toast.service';
import { BusService } from '@app/features/transport/services/bus.service';
import { BusFormPayload, BusResponse, BusType, BUS_TYPES } from '@app/features/transport/services/bus.models';
import { MaintenanceService } from '@app/features/transport/services/maintenance.service';
import {
  MaintenanceFormPayload, MaintenanceResponse, MaintenanceTransitionPayload, SUGGESTED_MAINTENANCE_TYPES,
} from '@app/features/transport/services/maintenance.models';
import { MaintenanceStatus } from '@app/features/transport/services/transport-enums';

@Component({
  selector: 'app-manage-vehicles',
  imports: [
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmTabsImports,
    HlmTableImports,
    HlmSheetImports,
    BrnSheetContent,
    HlmAlertDialogImports,
    BrnAlertDialogContent,
    HlmInputImports,
    HlmLabelImports,
    HlmSelectImports,
    PageHeader,
    StatusBadge,
  ],
  templateUrl: './manage-vehicles.html',
})
export class ManageVehicles {
  private readonly busService = inject(BusService);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  public readonly busTypes = BUS_TYPES;
  public readonly buses = signal<BusResponse[]>([]);
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);

  protected readonly activeTab = signal('fleet');

  public readonly sheetOpen = signal(false);
  public readonly editingBus = signal<BusResponse | null>(null);
  protected readonly selectedBusType = signal<BusType>(BUS_TYPES[0]);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly deleteTarget = signal<BusResponse | null>(null);
  protected readonly deleting = signal(false);

  public readonly suggestedMaintenanceTypes = SUGGESTED_MAINTENANCE_TYPES;
  public readonly maintenanceRecords = signal<MaintenanceResponse[]>([]);
  public readonly maintenanceLoading = signal(true);
  public readonly maintenanceError = signal<string | null>(null);
  public readonly maintenanceSheetOpen = signal(false);
  protected readonly selectedMaintenanceBusId = signal<string>('');
  protected readonly maintenanceSubmitting = signal(false);
  protected readonly maintenanceFormError = signal<string | null>(null);
  public readonly completeTarget = signal<MaintenanceResponse | null>(null);
  protected readonly completing = signal(false);

  constructor() {
    this.load();
    this.loadMaintenance();
  }

  protected load(): void {
    const providerId = this.authService.currentUser()?.providerId;
    if (providerId == null) {
      this.error.set('No provider account found for the current session.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.busService.listBuses(providerId).subscribe({
      next: (buses) => {
        this.buses.set(buses);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load fleet.');
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.editingBus.set(null);
    this.selectedBusType.set(BUS_TYPES[0]);
    this.formError.set(null);
    this.sheetOpen.set(true);
  }

  protected openEdit(bus: BusResponse): void {
    this.editingBus.set(bus);
    this.selectedBusType.set(bus.busType);
    this.formError.set(null);
    this.sheetOpen.set(true);
  }

  protected onBusTypeChange(value: string | null | undefined): void {
    if (value) {
      this.selectedBusType.set(value as BusType);
    }
  }

  protected onSheetStateChanged(state: 'open' | 'closed'): void {
    this.sheetOpen.set(state === 'open');
  }

  protected onSubmit(event: Event, busNumber: string, busName: string, totalSeats: string, amenitiesRaw: string): void {
    event.preventDefault();
    this.formError.set(null);

    const payload: BusFormPayload = {
      busNumber,
      busName,
      totalSeats: Number(totalSeats),
      busType: this.selectedBusType(),
      amenities: amenitiesRaw
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0),
    };

    const editing = this.editingBus();
    this.submitting.set(true);
    if (editing) {
      this.submitEdit(editing.id, payload);
    } else {
      this.submitCreate(payload);
    }
  }

  submitCreate(payload: BusFormPayload): void {
    const providerId = this.authService.currentUser()?.providerId;
    if (providerId == null) {
      this.submitting.set(false);
      this.toastService.error('No provider account found for the current session.');
      return;
    }
    this.busService.createBus(payload, providerId).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toastService.success('Bus created successfully.');
        this.sheetOpen.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        const message = err.error?.error?.message ?? 'Failed to create bus.';
        this.formError.set(message);
        this.toastService.error(message);
      },
    });
  }

  submitEdit(id: number, payload: BusFormPayload): void {
    const providerId = this.authService.currentUser()?.providerId;
    if (providerId == null) {
      this.submitting.set(false);
      this.toastService.error('No provider account found for the current session.');
      return;
    }
    this.busService.updateBus(id, payload, providerId).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toastService.success('Bus updated successfully.');
        this.sheetOpen.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        const message = err.error?.error?.message ?? 'Failed to update bus.';
        this.formError.set(message);
        this.toastService.error(message);
      },
    });
  }

  protected confirmDelete(bus: BusResponse): void {
    this.deleteTarget.set(bus);
  }

  protected onDeleteDialogStateChanged(state: 'open' | 'closed'): void {
    if (state === 'closed') {
      this.deleteTarget.set(null);
    }
  }

  protected deleteBus(): void {
    const target = this.deleteTarget();
    if (!target) {
      return;
    }
    this.deleting.set(true);
    this.busService.deleteBus(target.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.toastService.success('Bus deleted successfully.');
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.toastService.error(err.error?.error?.message ?? 'Failed to delete bus.');
      },
    });
  }

  protected loadMaintenance(): void {
    this.maintenanceLoading.set(true);
    this.maintenanceError.set(null);
    this.maintenanceService.listMaintenance().subscribe({
      next: (records) => {
        this.maintenanceRecords.set(records);
        this.maintenanceLoading.set(false);
      },
      error: () => {
        this.maintenanceError.set('Failed to load maintenance records.');
        this.maintenanceLoading.set(false);
      },
    });
  }

  validActions(status: MaintenanceStatus): ('START' | 'COMPLETE' | 'CANCEL')[] {
    switch (status) {
      case 'SCHEDULED':
        return ['START', 'CANCEL'];
      case 'IN_PROGRESS':
        return ['COMPLETE', 'CANCEL'];
      default:
        return [];
    }
  }

  protected openScheduleMaintenance(): void {
    this.maintenanceFormError.set(null);
    this.selectedMaintenanceBusId.set(this.buses()[0] ? String(this.buses()[0].id) : '');
    this.maintenanceSheetOpen.set(true);
  }

  protected onMaintenanceSheetStateChanged(state: 'open' | 'closed'): void {
    this.maintenanceSheetOpen.set(state === 'open');
  }

  protected onMaintenanceBusChange(value: string | null | undefined): void {
    if (value) {
      this.selectedMaintenanceBusId.set(value);
    }
  }

  protected onMaintenanceSubmit(
    event: Event,
    maintenanceType: string,
    scheduledDate: string,
    estimatedCostRaw: string,
    description: string,
    performedBy: string,
    nextMaintenanceDate: string,
  ): void {
    event.preventDefault();
    this.maintenanceFormError.set(null);

    const payload: MaintenanceFormPayload = {
      busId: Number(this.selectedMaintenanceBusId()),
      maintenanceType,
      scheduledDate,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(estimatedCostRaw.trim() ? { estimatedCost: Number(estimatedCostRaw) } : {}),
      ...(performedBy.trim() ? { performedBy: performedBy.trim() } : {}),
      ...(nextMaintenanceDate.trim() ? { nextMaintenanceDate } : {}),
    };

    this.maintenanceSubmitting.set(true);
    this.submitScheduleMaintenance(payload);
  }

  submitScheduleMaintenance(payload: MaintenanceFormPayload): void {
    this.maintenanceService.scheduleMaintenance(payload).subscribe({
      next: () => {
        this.maintenanceSubmitting.set(false);
        this.toastService.success('Maintenance scheduled successfully.');
        this.maintenanceSheetOpen.set(false);
        this.loadMaintenance();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.maintenanceSubmitting.set(false);
        const message = err.error?.error?.message ?? 'Failed to schedule maintenance.';
        this.maintenanceFormError.set(message);
        this.toastService.error(message);
      },
    });
  }

  transitionMaintenance(id: number, payload: MaintenanceTransitionPayload): void {
    this.maintenanceService.transitionStatus(id, payload).subscribe({
      next: () => {
        this.toastService.success('Maintenance status updated.');
        this.loadMaintenance();
        this.load();
      },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to update maintenance status.'),
    });
  }

  protected openComplete(record: MaintenanceResponse): void {
    this.completeTarget.set(record);
  }

  protected onCompleteDialogStateChanged(state: 'open' | 'closed'): void {
    if (state === 'closed') {
      this.completeTarget.set(null);
    }
  }

  confirmComplete(costRaw: string, completedDate: string): void {
    const target = this.completeTarget();
    if (!target) {
      return;
    }
    this.completing.set(true);
    this.maintenanceService
      .transitionStatus(target.id, { status: 'COMPLETED', cost: Number(costRaw), completedDate })
      .subscribe({
        next: () => {
          this.completing.set(false);
          this.completeTarget.set(null);
          this.toastService.success('Maintenance status updated.');
          this.loadMaintenance();
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.completing.set(false);
          this.toastService.error(err.error?.error?.message ?? 'Failed to update maintenance status.');
        },
      });
  }
}
