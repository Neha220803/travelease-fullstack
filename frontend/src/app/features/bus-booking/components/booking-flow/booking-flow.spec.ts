import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { BookingFlow } from '@app/features/bus-booking/components/booking-flow/booking-flow';
import { ScheduleService } from '@app/features/bus-booking/services/schedule.service';
import { BookingService } from '@app/features/bus-booking/services/booking.service';

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
});
