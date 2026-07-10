import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { BookingFlow } from '@app/features/bus-booking/components/booking-flow/booking-flow';
import { ScheduleService } from '@app/features/bus-booking/services/schedule.service';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { BusSearchResult, SeatLayoutResponse } from '@app/features/bus-booking/services/schedule.models';

interface BookingFlowHarness {
  selectBus: (bus: BusSearchResult) => void;
  onSeatSelectionChange: (seatIds: number[]) => void;
  proceedToPassengers: () => void;
  passengersValid: () => boolean;
}

const TEST_BUS: BusSearchResult = {
  scheduleId: 5,
  busName: 'Test Bus',
  busNumber: 'T-100',
  busType: 'AC Sleeper',
  source: 'CityA',
  destination: 'CityB',
  departureTime: '08:00',
  arrivalTime: '12:00',
  fare: 500,
  availableSeats: 10,
  duration: 240,
  travelDate: '2026-07-15',
  amenities: [],
};

function twoSeatLayout(): SeatLayoutResponse {
  return {
    busId: 1,
    busName: 'Test Bus',
    seats: [
      { id: 1, seatNumber: 'A1', seatType: 'WINDOW', deck: 1, status: 'AVAILABLE' },
      { id: 2, seatNumber: 'A2', seatType: 'AISLE', deck: 1, status: 'AVAILABLE' },
    ],
  };
}

async function createBookingFlowFixture(seatLayout: SeatLayoutResponse) {
  await TestBed.configureTestingModule({
    imports: [BookingFlow],
    providers: [
      provideRouter([]),
      {
        provide: ScheduleService,
        useValue: {
          searchBuses: () => of([]),
          getSeats: () => of(seatLayout),
          calculateFare: () => of({ breakdown: {}, totalPayable: 0, totalSavings: 0 }),
        },
      },
      { provide: BookingService, useValue: { createBooking: () => of({ id: 1, status: 'CONFIRMED' }) } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(BookingFlow);
  const harness = fixture.componentInstance as unknown as BookingFlowHarness;
  fixture.detectChanges();
  return { fixture, harness };
}

describe('BookingFlow', () => {
  it('navigates to confirmation with a tripId query param when tripId input is set', async () => {
    const bookingService = { createBooking: () => of({ id: 99, status: 'CONFIRMED' }) };
    await TestBed.configureTestingModule({
      imports: [BookingFlow],
      providers: [
        provideRouter([]),
        { provide: ScheduleService, useValue: { searchBuses: () => of([]), calculateFare: () => of({ breakdown: {}, totalPayable: 0, totalSavings: 0 }) } },
        { provide: BookingService, useValue: bookingService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(BookingFlow);
    fixture.componentRef.setInput('tripId', 'trip-1');
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    (fixture.componentInstance as unknown as { submitBooking: () => void }).submitBooking();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(['/bus-booking/confirmation', 99], { queryParams: { tripId: 'trip-1' } });
  });

  it('navigates to confirmation with no query params when tripId is not set', async () => {
    const bookingService = { createBooking: () => of({ id: 100, status: 'CONFIRMED' }) };
    await TestBed.configureTestingModule({
      imports: [BookingFlow],
      providers: [
        provideRouter([]),
        { provide: ScheduleService, useValue: { searchBuses: () => of([]), calculateFare: () => of({ breakdown: {}, totalPayable: 0, totalSavings: 0 }) } },
        { provide: BookingService, useValue: bookingService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(BookingFlow);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    (fixture.componentInstance as unknown as { submitBooking: () => void }).submitBooking();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(['/bus-booking/confirmation', 100], { queryParams: {} });
  });

  it('keeps typed passenger data across repeated change-detection cycles and enables Continue to Review', async () => {
    const { fixture, harness } = await createBookingFlowFixture(twoSeatLayout());

    harness.selectBus(TEST_BUS);
    fixture.detectChanges();
    harness.onSeatSelectionChange([1, 2]);
    fixture.detectChanges();
    harness.proceedToPassengers();
    fixture.detectChanges();

    const nameInputs = fixture.nativeElement.querySelectorAll('input[data-role="name"]') as NodeListOf<HTMLInputElement>;
    const ageInputs = fixture.nativeElement.querySelectorAll('input[data-role="age"]') as NodeListOf<HTMLInputElement>;
    expect(nameInputs.length).toBe(2);
    expect(ageInputs.length).toBe(2);

    nameInputs[0].value = 'Alice';
    nameInputs[0].dispatchEvent(new Event('input'));
    ageInputs[0].value = '30';
    ageInputs[0].dispatchEvent(new Event('input'));
    nameInputs[1].value = 'Bob';
    nameInputs[1].dispatchEvent(new Event('input'));
    ageInputs[1].value = '25';
    ageInputs[1].dispatchEvent(new Event('input'));

    // Regression guard: repeated, unrelated change-detection passes (as would
    // happen from any other DOM event in the app) previously handed
    // PassengerDetailsForm a freshly-filtered `seats` array on every tick,
    // re-triggering its constructor effect and wiping these rows back to blank.
    fixture.detectChanges();
    fixture.detectChanges();
    fixture.detectChanges();

    expect(nameInputs[0].value).toBe('Alice');
    expect(ageInputs[0].value).toBe('30');
    expect(nameInputs[1].value).toBe('Bob');
    expect(ageInputs[1].value).toBe('25');
    expect(harness.passengersValid()).toBe(true);

    const continueButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLButtonElement).textContent?.includes('Continue to Review'),
    ) as HTMLButtonElement;
    expect(continueButton.disabled).toBe(false);
  });

  it('rebuilds passenger rows when the actual selected seats change', async () => {
    const { fixture, harness } = await createBookingFlowFixture(twoSeatLayout());

    harness.selectBus(TEST_BUS);
    fixture.detectChanges();
    harness.onSeatSelectionChange([1]);
    fixture.detectChanges();
    harness.proceedToPassengers();
    fixture.detectChanges();

    let nameInputs = fixture.nativeElement.querySelectorAll('input[data-role="name"]') as NodeListOf<HTMLInputElement>;
    expect(nameInputs.length).toBe(1);
    nameInputs[0].value = 'Alice';
    nameInputs[0].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // A genuine seat-selection change (e.g. the user goes back and adds seat 2)
    // must still rebuild the passenger rows to match the new seat set.
    harness.onSeatSelectionChange([1, 2]);
    fixture.detectChanges();

    nameInputs = fixture.nativeElement.querySelectorAll('input[data-role="name"]') as NodeListOf<HTMLInputElement>;
    expect(nameInputs.length).toBe(2);
    expect(harness.passengersValid()).toBe(false);
  });
});
