import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { BrnSheetContent } from '@spartan-ng/brain/sheet';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { BrnAlertDialogContent } from '@spartan-ng/brain/alert-dialog';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { AuthService } from '@app/core/auth/auth.service';
import { ToastService } from '@app/core/toast/toast.service';
import { TripService } from '@app/features/transport/services/trip.service';
import { ScheduleService } from '@app/features/transport/services/schedule.service';
import { DriverService } from '@app/features/transport/services/driver.service';
import { ConductorService } from '@app/features/transport/services/conductor.service';
import {
  FleetAvailabilityResponse, TripAssignmentPayload, TripResponse,
} from '@app/features/transport/services/trip.models';
import { TripStatus } from '@app/features/transport/services/transport-enums';
import { ScheduleResponse } from '@app/features/transport/services/schedule.models';
import { ConductorResponse, DriverResponse } from '@app/features/transport/services/staff.models';

type TripAction = 'BOARDING' | 'DEPARTED' | 'RUNNING' | 'DELAYED' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED';

@Component({
  selector: 'app-bus-trips',
  imports: [
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmTableImports,
    HlmSheetImports,
    BrnSheetContent,
    HlmAlertDialogImports,
    BrnAlertDialogContent,
    HlmSelectImports,
    HlmInputImports,
    HlmLabelImports,
    PageHeader,
    StatusBadge,
  ],
  templateUrl: './bus-trips.html',
})
export class BusTrips {
  private readonly tripService = inject(TripService);
  private readonly scheduleService = inject(ScheduleService);
  private readonly driverService = inject(DriverService);
  private readonly conductorService = inject(ConductorService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  public readonly trips = signal<TripResponse[]>([]);
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  public readonly availability = signal<FleetAvailabilityResponse | null>(null);

  private readonly allSchedules = signal<ScheduleResponse[]>([]);
  public readonly assignableSchedules = computed(() =>
    this.allSchedules().filter((s) => s.status === 'SCHEDULED'),
  );
  private readonly scheduleById = computed(
    () => new Map(this.allSchedules().map((s) => [s.id, s])),
  );

  private readonly allDrivers = signal<DriverResponse[]>([]);
  public readonly availableDrivers = computed(() => this.allDrivers().filter((d) => d.status === 'AVAILABLE'));
  private readonly allConductors = signal<ConductorResponse[]>([]);
  public readonly availableConductors = computed(() => this.allConductors().filter((c) => c.status === 'AVAILABLE'));

  public readonly assignSheetOpen = signal(false);
  protected readonly selectedScheduleId = signal<string>('');
  protected readonly selectedDriverId = signal<string>('');
  protected readonly selectedConductorId = signal<string>('');
  protected readonly assignSubmitting = signal(false);
  protected readonly assignFormError = signal<string | null>(null);

  protected readonly delayTarget = signal<TripResponse | null>(null);
  protected readonly delaySubmitting = signal(false);
  protected readonly completeTarget = signal<TripResponse | null>(null);
  protected readonly completeSubmitting = signal(false);
  protected readonly cancelTarget = signal<TripResponse | null>(null);
  protected readonly cancelSubmitting = signal(false);

  constructor() {
    this.load();
    const providerId = this.authService.currentUser()?.providerId;
    if (providerId != null) {
      this.tripService.getFleetAvailability(providerId).subscribe((a) => this.availability.set(a));
      this.scheduleService.listMySchedules(providerId).subscribe((schedules) => this.allSchedules.set(schedules));
    }
    this.driverService.listDrivers().subscribe((drivers) => this.allDrivers.set(drivers));
    this.conductorService.listConductors().subscribe((conductors) => this.allConductors.set(conductors));
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.tripService.listTrips().subscribe({
      next: (trips) => {
        this.trips.set(trips);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load trips.');
        this.loading.set(false);
      },
    });
  }

  validActions(status: TripStatus): TripAction[] {
    switch (status) {
      case 'SCHEDULED':
        return ['BOARDING', 'CANCELLED'];
      case 'BOARDING':
        return ['DEPARTED', 'CANCELLED'];
      case 'DEPARTED':
        return ['RUNNING', 'DELAYED', 'CANCELLED'];
      case 'RUNNING':
        return ['DELAYED', 'ARRIVED', 'CANCELLED'];
      case 'DELAYED':
        return ['ARRIVED', 'CANCELLED'];
      case 'ARRIVED':
        return ['COMPLETED', 'CANCELLED'];
      default:
        return [];
    }
  }

  routeLabel(trip: TripResponse): string {
    const schedule = this.scheduleById().get(trip.scheduleId);
    return schedule ? `${schedule.route.source} → ${schedule.route.destination}` : `Schedule #${trip.scheduleId}`;
  }

  travelDate(trip: TripResponse): string {
    return this.scheduleById().get(trip.scheduleId)?.travelDate ?? '—';
  }

  protected openAssignCrew(): void {
    this.assignFormError.set(null);
    this.selectedScheduleId.set(this.assignableSchedules()[0] ? String(this.assignableSchedules()[0].id) : '');
    this.selectedDriverId.set('');
    this.selectedConductorId.set('');
    this.assignSheetOpen.set(true);
  }

  protected onAssignSheetStateChanged(state: 'open' | 'closed'): void {
    this.assignSheetOpen.set(state === 'open');
  }

  protected onScheduleChange(value: string | null | undefined): void {
    if (value) {
      this.selectedScheduleId.set(value);
    }
  }

  protected onDriverChange(value: string | null | undefined): void {
    this.selectedDriverId.set(value ?? '');
  }

  protected onConductorChange(value: string | null | undefined): void {
    this.selectedConductorId.set(value ?? '');
  }

  protected onAssignSubmit(event: Event, notes: string): void {
    event.preventDefault();
    this.assignFormError.set(null);

    const scheduleId = Number(this.selectedScheduleId());
    if (!scheduleId) {
      this.assignFormError.set('Select a schedule.');
      return;
    }

    const payload: TripAssignmentPayload = {
      scheduleId,
      ...(this.selectedDriverId() ? { driverId: Number(this.selectedDriverId()) } : {}),
      ...(this.selectedConductorId() ? { conductorId: Number(this.selectedConductorId()) } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    this.assignSubmitting.set(true);
    this.submitAssignCrew(payload);
  }

  submitAssignCrew(payload: TripAssignmentPayload): void {
    this.tripService.assignTrip(payload).subscribe({
      next: () => {
        this.assignSubmitting.set(false);
        this.toastService.success('Crew assigned successfully.');
        this.assignSheetOpen.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.assignSubmitting.set(false);
        const message = err.error?.error?.message ?? 'Failed to assign crew.';
        this.assignFormError.set(message);
        this.toastService.error(message);
      },
    });
  }

  protected transition(
    trip: TripResponse,
    action: TripAction,
    extra: { delayMinutes?: number; distanceCoveredKm?: number; reason?: string } = {},
  ): void {
    this.tripService.transitionStatus(trip.id, { status: action, ...extra }).subscribe({
      next: () => {
        this.toastService.success('Trip status updated.');
        this.load();
      },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to update trip status.'),
    });
  }

  protected openDelay(trip: TripResponse): void {
    this.delayTarget.set(trip);
  }

  protected onDelayDialogStateChanged(state: 'open' | 'closed'): void {
    if (state === 'closed') {
      this.delayTarget.set(null);
    }
  }

  protected confirmDelay(delayMinutesRaw: string): void {
    const target = this.delayTarget();
    if (!target) {
      return;
    }
    this.delaySubmitting.set(true);
    this.tripService.transitionStatus(target.id, { status: 'DELAYED', delayMinutes: Number(delayMinutesRaw) }).subscribe({
      next: () => {
        this.delaySubmitting.set(false);
        this.delayTarget.set(null);
        this.toastService.success('Trip status updated.');
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.delaySubmitting.set(false);
        this.toastService.error(err.error?.error?.message ?? 'Failed to update trip status.');
      },
    });
  }

  protected openComplete(trip: TripResponse): void {
    this.completeTarget.set(trip);
  }

  protected onCompleteDialogStateChanged(state: 'open' | 'closed'): void {
    if (state === 'closed') {
      this.completeTarget.set(null);
    }
  }

  protected confirmComplete(distanceCoveredKmRaw: string): void {
    const target = this.completeTarget();
    if (!target) {
      return;
    }
    this.completeSubmitting.set(true);
    this.tripService
      .transitionStatus(target.id, { status: 'COMPLETED', distanceCoveredKm: Number(distanceCoveredKmRaw) })
      .subscribe({
        next: () => {
          this.completeSubmitting.set(false);
          this.completeTarget.set(null);
          this.toastService.success('Trip status updated.');
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.completeSubmitting.set(false);
          this.toastService.error(err.error?.error?.message ?? 'Failed to update trip status.');
        },
      });
  }

  protected openCancel(trip: TripResponse): void {
    this.cancelTarget.set(trip);
  }

  protected onCancelDialogStateChanged(state: 'open' | 'closed'): void {
    if (state === 'closed') {
      this.cancelTarget.set(null);
    }
  }

  protected confirmCancel(reason: string): void {
    const target = this.cancelTarget();
    if (!target) {
      return;
    }
    this.cancelSubmitting.set(true);
    this.tripService
      .transitionStatus(target.id, { status: 'CANCELLED', ...(reason.trim() ? { reason: reason.trim() } : {}) })
      .subscribe({
        next: () => {
          this.cancelSubmitting.set(false);
          this.cancelTarget.set(null);
          this.toastService.success('Trip status updated.');
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.cancelSubmitting.set(false);
          this.toastService.error(err.error?.error?.message ?? 'Failed to update trip status.');
        },
      });
  }
}
