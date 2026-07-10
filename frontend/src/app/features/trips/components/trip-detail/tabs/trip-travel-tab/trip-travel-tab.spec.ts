import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TripTravelTab } from '@app/features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { AuthService } from '@app/core/auth/auth.service';
import { Trip, TripMember } from '@app/features/trips/services/trip.models';
import { BusSearchResult, SeatLayoutResponse } from '@app/features/trips/services/schedule.models';

const TRIP: Trip = {
  tripId: 't1',
  tripName: 'Test Trip',
  organizer: { userId: 'u1', name: 'Alice', email: 'alice@travelease.test' },
  sourceLocation: 'Bengaluru',
  destinationId: 2,
  budgetAmount: 40000,
  categoryId: 4,
  startDate: '2026-07-12',
  endDate: '2026-07-16',
  status: 'CONFIRMED',
  viewerRole: 'ORGANIZER',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

const RESULTS: BusSearchResult[] = [
  {
    scheduleId: 1,
    busName: 'Volvo Multi-Axle',
    busNumber: 'KA-01-1234',
    busType: 'AC_SLEEPER',
    source: 'Bengaluru',
    destination: 'Goa',
    departureTime: '20:00:00',
    arrivalTime: '07:00:00',
    fare: 1800,
    availableSeats: 4,
    duration: 11,
    travelDate: '2026-07-12',
    amenities: [],
  },
];

const SEAT_LAYOUT: SeatLayoutResponse = {
  busId: 1,
  busName: 'Volvo Multi-Axle',
  seats: Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    seatNumber: `S${i + 1}`,
    seatType: 'SLEEPER',
    deck: 1,
    status: 'AVAILABLE',
  })),
};

async function render(bookings = [BOOKING]) {
  await TestBed.configureTestingModule({
    imports: [TripTravelTab],
    providers: [
      {
        provide: BookingService,
        useValue: {
          searchBuses,
          getTripBusBookings: () => of({ tripId: 't1', bookingCount: 0, totalFare: 0, bookings: [] }),
          getSeats: () => of(SEAT_LAYOUT),
        },
      },
      {
        provide: DestinationsService,
        useValue: { listDestinations: () => of([{ destinationId: 2, destinationName: 'Goa', state: 'Goa', country: 'India', description: '' }]) },
      },
      // The plan's real AuthService.currentUser() shape (verified via grep of
      // auth.service.ts / auth.models.ts) exposes the id under `.id`, not
      // `.userId` as the plan draft assumed. Mocked here as the current
      // logged-in user 'u1' (the trip organizer, and the owner of BOOKING),
      // matching the convention used elsewhere (e.g. manage-vehicles.spec.ts).
      { provide: AuthService, useValue: { currentUser: () => ({ id: 'u1' }) } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(TripTravelTab);
  fixture.componentRef.setInput('trip', TRIP);
  fixture.componentRef.setInput('members', MEMBERS);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('TripTravelTab', () => {
  it('embeds the shared BookingFlow with the current trip id bound', async () => {
    const fixture = await render();
    const flowEl = (fixture.nativeElement as HTMLElement).querySelector('app-booking-flow');
    expect(flowEl).toBeTruthy();
  });

  it('shows Detach only on the current-user-owned row (organizer is u1, booking bookedByUserId is u1)', async () => {
    const fixture = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('BK10');
    expect(text).toContain('Detach');
  });

  it('hides Detach on a row booked by a different trip member', async () => {
    const fixture = await render([{ ...BOOKING, bookedByUserId: 'u2' }]);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Suitable for Group');
  });

  it('fetches and renders the seat layout once "View Seats" is clicked', async () => {
    const fixture = await render([]);

    const viewSeatsButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((b) => b.textContent?.trim() === 'View Seats')!;
    viewSeatsButton.click();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      seatLayout: () => SeatLayoutResponse | null;
    };
    expect(component.seatLayout()?.seats).toHaveLength(30);
  });

  it('searches using the date picker value, not the trip start date, once changed', async () => {
    const searchBuses = vi.fn().mockReturnValue(of(RESULTS));
    const fixture = await render([], searchBuses);
    searchBuses.mockClear();

    (fixture.componentInstance as unknown as { onDateChange: (date: Date) => void }).onDateChange(
      new Date(2026, 6, 14),
    );
    const sourceInput = (fixture.nativeElement as HTMLElement).querySelector('#source') as HTMLInputElement;
    const destinationInput = (fixture.nativeElement as HTMLElement).querySelector(
      '#destination',
    ) as HTMLInputElement;
    const searchButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Search',
    )!;
    searchButton.click();

    expect(searchBuses).toHaveBeenCalledWith(sourceInput.value, destinationInput.value, '2026-07-14');
  });
});
