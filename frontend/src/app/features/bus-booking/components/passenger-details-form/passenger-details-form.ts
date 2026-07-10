import { Component, computed, effect, input, output, signal } from '@angular/core';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { SeatResponse } from '@app/features/bus-booking/services/schedule.models';
import { PassengerDetailDto } from '@app/features/bus-booking/services/booking.models';

interface PassengerRow {
  seatId: number;
  seatNumber: string;
  isLadiesSeat: boolean;
  name: string;
  age: number | null;
  gender: 'FEMALE' | 'MALE' | 'OTHER';
  email: string;
  phone: string;
}

@Component({
  selector: 'app-passenger-details-form',
  imports: [HlmInputImports, HlmLabelImports, HlmCardImports],
  templateUrl: './passenger-details-form.html',
})
export class PassengerDetailsForm {
  public readonly seats = input.required<SeatResponse[]>();
  public readonly detailsChange = output<{ valid: boolean; passengers: PassengerDetailDto[] }>();

  protected readonly rows = signal<PassengerRow[]>([]);
  protected readonly primarySeatId = signal<number | null>(null);

  constructor() {
    // NOTE: this effect intentionally reads only `this.seats()`. Routing the
    // initial emit through the plain `emit()` helper (which reads the `rows`/
    // `primarySeatId` signals) would make the effect reactively depend on
    // those signals too — since `updateRow()`/`setPrimary()` write them from
    // template event handlers, that would re-trigger this effect on every
    // keystroke and reset all typed passenger data back to blank. Computing
    // the emit inline from local variables avoids that self-triggering loop.
    effect(() => {
      const seats = this.seats();
      const newRows: PassengerRow[] = seats.map((s) => ({
        seatId: s.id,
        seatNumber: s.seatNumber,
        isLadiesSeat: s.seatType === 'LADIES',
        name: '',
        age: null,
        gender: s.seatType === 'LADIES' ? 'FEMALE' : 'OTHER',
        email: '',
        phone: '',
      }));
      const newPrimary = seats.length > 0 ? seats[0].id : null;
      this.rows.set(newRows);
      this.primarySeatId.set(newPrimary);
      this.emitFrom(newRows, newPrimary);
    });
  }

  protected readonly isValid = computed(() =>
    this.rows().every((r) => r.name.trim().length > 0 && r.age !== null && r.age > 0),
  );

  protected updateRow(seatId: number, patch: Partial<PassengerRow>): void {
    this.rows.set(this.rows().map((r) => (r.seatId === seatId ? { ...r, ...patch } : r)));
    this.emit();
  }

  protected setPrimary(seatId: number): void {
    this.primarySeatId.set(seatId);
    this.emit();
  }

  private emit(): void {
    this.emitFrom(this.rows(), this.primarySeatId());
  }

  private emitFrom(rows: PassengerRow[], primary: number | null): void {
    const passengers: PassengerDetailDto[] = rows.map((r) => ({
      seatId: r.seatId,
      passengerName: r.name,
      passengerAge: r.age ?? 0,
      passengerGender: r.gender,
      passengerEmail: r.email || undefined,
      passengerPhone: r.phone || undefined,
      isPrimary: r.seatId === primary,
    }));
    const valid = rows.every((r) => r.name.trim().length > 0 && r.age !== null && r.age > 0);
    this.detailsChange.emit({ valid, passengers });
  }
}
