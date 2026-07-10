import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SeatGrid } from '@app/features/bus-booking/components/seat-grid/seat-grid';
import { ScheduleService } from '@app/features/bus-booking/services/schedule.service';
import { ToastService } from '@app/shared/ui/toast/toast.service';
import { SeatLayoutResponse } from '@app/features/bus-booking/services/schedule.models';

const LAYOUT: SeatLayoutResponse = {
  busId: 1,
  busName: 'Volvo',
  seats: [
    { id: 1, seatNumber: 'A1', seatType: 'WINDOW', deck: 1, status: 'AVAILABLE' },
    { id: 2, seatNumber: 'A2', seatType: 'LADIES', deck: 1, status: 'AVAILABLE' },
  ],
};

async function render(lockSeats = () => of({ scheduleId: 1, lockedSeatIds: [1], lockedAt: '', expiresAt: '', message: '' })) {
  await TestBed.configureTestingModule({
    imports: [SeatGrid],
    providers: [
      { provide: ScheduleService, useValue: { lockSeats, unlockSeats: () => of(undefined) } },
      { provide: ToastService, useValue: { showError: vi.fn(), showSuccess: vi.fn() } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(SeatGrid);
  fixture.componentRef.setInput('scheduleId', 1);
  fixture.componentRef.setInput('layout', LAYOUT);
  fixture.detectChanges();
  return fixture;
}

describe('SeatGrid', () => {
  it('locks a seat and emits selectionChange on successful click', async () => {
    const fixture = await render();
    let emitted: number[] | undefined;
    fixture.componentInstance.selectionChange.subscribe((ids) => (emitted = ids));

    const button = (fixture.nativeElement as HTMLElement).querySelector('button[data-seat-id="1"]') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();

    expect(emitted).toEqual([1]);
  });

  it('reconciles the selection and shows a conflict toast on 409 SEAT_UNAVAILABLE', async () => {
    const lockSeats = () => throwError(() => ({ status: 409, error: { error: { code: 'SEAT_UNAVAILABLE', message: 'locked by another user' } } }));
    const fixture = await render(lockSeats);
    const toast = TestBed.inject(ToastService);

    const button = (fixture.nativeElement as HTMLElement).querySelector('button[data-seat-id="1"]') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();

    expect(toast.showError).toHaveBeenCalledWith('locked by another user');
    expect(fixture.componentInstance.selectedSeatIds()).toEqual([]);
  });
});
