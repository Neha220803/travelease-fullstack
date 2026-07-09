import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { BrnSheetContent } from '@spartan-ng/brain/sheet';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { AuthService } from '@app/core/auth/auth.service';
import { ToastService } from '@app/core/toast/toast.service';
import { ScheduleService } from '@app/features/transport/services/schedule.service';
import { RouteReferenceService } from '@app/features/transport/services/route-reference.service';
import { BusService } from '@app/features/transport/services/bus.service';
import { ScheduleFormPayload, ScheduleResponse } from '@app/features/transport/services/schedule.models';
import { RouteReferenceResponse } from '@app/features/transport/services/route-reference.models';
import { BusResponse } from '@app/features/transport/services/bus.models';

@Component({
  selector: 'app-manage-schedules',
  imports: [
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmTableImports,
    HlmSheetImports,
    BrnSheetContent,
    HlmSelectImports,
    HlmInputImports,
    HlmLabelImports,
    PageHeader,
    StatusBadge,
  ],
  templateUrl: './manage-schedules.html',
})
export class ManageSchedules {
  private readonly scheduleService = inject(ScheduleService);
  private readonly routeReferenceService = inject(RouteReferenceService);
  private readonly busService = inject(BusService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  public readonly schedules = signal<ScheduleResponse[]>([]);
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  public readonly sheetOpen = signal(false);
  public readonly editingSchedule = signal<ScheduleResponse | null>(null);

  public readonly activeRoutes = signal<RouteReferenceResponse[]>([]);
  private readonly allBuses = signal<BusResponse[]>([]);
  public readonly activeBuses = computed(() => this.allBuses().filter((b) => b.status === 'ACTIVE'));

  protected readonly selectedRouteId = signal<string>('');
  protected readonly selectedBusId = signal<string>('');
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  constructor() {
    this.load();
    this.routeReferenceService.listActiveRoutes().subscribe((routes) => this.activeRoutes.set(routes));
    const providerId = this.authService.currentUser()?.providerId;
    if (providerId != null) {
      this.busService.listBuses(providerId).subscribe((buses) => this.allBuses.set(buses));
    }
  }

  load(): void {
    const providerId = this.authService.currentUser()?.providerId;
    if (providerId == null) {
      this.error.set('No provider account found for the current session.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.scheduleService.listMySchedules(providerId).subscribe({
      next: (schedules) => {
        this.schedules.set(schedules);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load schedules.');
        this.loading.set(false);
      },
    });
  }

  canCancel(schedule: ScheduleResponse): boolean {
    return schedule.status !== 'CANCELLED';
  }

  protected openCreate(): void {
    this.editingSchedule.set(null);
    this.selectedRouteId.set(this.activeRoutes()[0] ? String(this.activeRoutes()[0].id) : '');
    this.selectedBusId.set(this.activeBuses()[0] ? String(this.activeBuses()[0].id) : '');
    this.formError.set(null);
    this.sheetOpen.set(true);
  }

  protected openEdit(schedule: ScheduleResponse): void {
    this.editingSchedule.set(schedule);
    this.selectedRouteId.set(String(schedule.route.id));
    this.selectedBusId.set(String(schedule.bus.id));
    this.formError.set(null);
    this.sheetOpen.set(true);
  }

  protected onSheetStateChanged(state: 'open' | 'closed'): void {
    this.sheetOpen.set(state === 'open');
  }

  protected onRouteChange(value: string | null | undefined): void {
    if (value) {
      this.selectedRouteId.set(value);
    }
  }

  protected onBusChange(value: string | null | undefined): void {
    if (value) {
      this.selectedBusId.set(value);
    }
  }

  protected onSubmit(
    event: Event,
    travelDate: string,
    departureTime: string,
    arrivalTime: string,
    fareRaw: string,
  ): void {
    event.preventDefault();
    this.formError.set(null);

    const payload: ScheduleFormPayload = {
      busId: Number(this.selectedBusId()),
      routeId: Number(this.selectedRouteId()),
      travelDate,
      departureTime,
      arrivalTime,
      fare: Number(fareRaw),
    };

    const editing = this.editingSchedule();
    this.submitting.set(true);
    if (editing) {
      this.submitEdit(editing.id, payload);
    } else {
      this.submitCreate(payload);
    }
  }

  submitCreate(payload: ScheduleFormPayload): void {
    this.scheduleService.createSchedule(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toastService.success('Schedule created successfully.');
        this.sheetOpen.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        const message = err.error?.error?.message ?? 'Failed to create schedule.';
        this.formError.set(message);
        this.toastService.error(message);
      },
    });
  }

  submitEdit(id: number, payload: ScheduleFormPayload): void {
    this.scheduleService.updateSchedule(id, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toastService.success('Schedule updated successfully.');
        this.sheetOpen.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        const message = err.error?.error?.message ?? 'Failed to update schedule.';
        this.formError.set(message);
        this.toastService.error(message);
      },
    });
  }

  cancelSchedule(id: number): void {
    this.scheduleService.cancelSchedule(id).subscribe({
      next: () => {
        this.toastService.success('Schedule cancelled.');
        this.load();
      },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to cancel schedule.'),
    });
  }
}
