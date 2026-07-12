import { Component, input, output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HotelsService } from '@app/core/hotels/hotels.service';
import { Hotel } from '@app/core/hotels/hotel.models';
import { Trip } from '@app/features/trips/services/trip.models';
import { ToastService } from '@app/shared/ui/toast/toast.service';

@Component({
  selector: 'app-hotel-booking-flow',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSelectImports,
  ],
  templateUrl: './hotel-booking-flow.html',
})
export class HotelBookingFlow {
  public readonly hotel = input.required<Hotel>();
  public readonly trip = input.required<Trip>();

  public readonly bookingComplete = output<{ hotelBookingId: string }>();
  public readonly cancel = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly hotelsService = inject(HotelsService);
  private readonly toastService = inject(ToastService);

  public readonly step = signal<1 | 2 | 3>(1);
  public readonly selectedRoomType = signal<string>('STANDARD');
  public readonly isLocking = signal(false);
  public readonly isBooking = signal(false);
  
  public lockedRoomId = signal<string | null>(null);
  public lockExpiresAt = signal<string | null>(null);

  public readonly guestForm = this.fb.group({
    contactEmail: ['', [Validators.required, Validators.email]],
    contactPhone: ['', [Validators.required]],
    guests: this.fb.array([
      this.fb.group({
        name: ['', Validators.required],
        age: [null as number | null, [Validators.required, Validators.min(1)]],
        gender: ['', Validators.required],
        isPrimary: [true],
      })
    ])
  });

  get guests() {
    return this.guestForm.get('guests') as FormArray;
  }

  addGuest() {
    this.guests.push(
      this.fb.group({
        name: ['', Validators.required],
        age: [null, [Validators.required, Validators.min(1)]],
        gender: ['', Validators.required],
        isPrimary: [false],
      })
    );
  }

  removeGuest(index: number) {
    if (this.guests.length > 1) {
      this.guests.removeAt(index);
    }
  }

  onRoomTypeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedRoomType.set(select.value);
  }

  lockAndProceed() {
    this.isLocking.set(true);
    const hotel = this.hotel();
    const trip = this.trip();

    this.hotelsService.lockRoom({
      hotelId: hotel.hotelId,
      roomType: this.selectedRoomType(),
      checkInDate: trip.startDate,
      checkOutDate: trip.endDate,
    }).subscribe({
      next: (res) => {
        this.lockedRoomId.set(res.roomId);
        this.lockExpiresAt.set(res.expiresAt);
        this.isLocking.set(false);
        this.step.set(2);
      },
      error: (err) => {
        this.toastService.showError(err.error?.message || 'Failed to lock room. It may be unavailable.');
        this.isLocking.set(false);
      }
    });
  }

  goToReview() {
    if (this.guestForm.invalid) {
      this.guestForm.markAllAsTouched();
      this.toastService.showError('Please fill in all required fields correctly.');
      return;
    }
    this.step.set(3);
  }

  confirmBooking() {
    const hotel = this.hotel();
    const trip = this.trip();
    const roomId = this.lockedRoomId();
    if (!roomId) return;

    const formVal = this.guestForm.value;
    
    this.isBooking.set(true);
    this.hotelsService.createBooking({
      tripId: trip.tripId,
      hotelId: hotel.hotelId,
      checkInDate: trip.startDate,
      checkOutDate: trip.endDate,
      roomType: this.selectedRoomType(),
      lockedRoomId: roomId,
      guestDetails: formVal.guests as any,
      contactEmail: formVal.contactEmail || undefined,
      contactPhone: formVal.contactPhone || undefined,
    }).subscribe({
      next: (res) => {
        this.isBooking.set(false);
        this.bookingComplete.emit(res);
      },
      error: (err) => {
        this.toastService.showError(err.error?.message || 'Failed to confirm booking.');
        this.isBooking.set(false);
      }
    });
  }

  onCancel() {
    const roomId = this.lockedRoomId();
    if (roomId) {
      this.hotelsService.unlockRoom(roomId).subscribe();
    }
    this.cancel.emit();
  }
}
