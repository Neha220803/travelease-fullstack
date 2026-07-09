import { TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { lucideAlertTriangle, lucideArrowRight, lucideBus, lucideSparkles } from '@ng-icons/lucide';
import { of } from 'rxjs';
import { TripTravelTab } from '@app/features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab';
import { ScheduleService } from '@app/features/trips/services/schedule.service';
import { DestinationsService } from '@app/core/destinations/destinations.service';
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

async function render(members: TripMember[], searchBuses = () => of(RESULTS)) {
  await TestBed.configureTestingModule({
    imports: [TripTravelTab],
    providers: [
      provideIcons({ lucideAlertTriangle, lucideArrowRight, lucideBus, lucideSparkles }),
      {
        provide: ScheduleService,
        useValue: {
          searchBuses,
          getTripBusBookings: () => of({ tripId: 't1', bookingCount: 0, totalFare: 0, bookings: [] }),
          getSeats: () => of(SEAT_LAYOUT),
        },
      },
      {
        provide: DestinationsService,
        useValue: {
          listDestinations: () =>
            of([{ destinationId: 2, destinationName: 'Goa', state: 'Goa', country: 'India', description: '' }]),
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(TripTravelTab);
  fixture.componentRef.setInput('trip', TRIP);
  fixture.componentRef.setInput('members', members);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('TripTravelTab', () => {
  it('auto-searches on load using the trip source/destination/date and renders results', async () => {
    const searchBuses = vi.fn().mockReturnValue(of(RESULTS));
    const fixture = await render([], searchBuses);

    expect(searchBuses).toHaveBeenCalledWith('Bengaluru', 'Goa', '2026-07-12');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Volvo Multi-Axle');
  });

  it('shows the Suitable for Group badge when the trip has few members', async () => {
    const members: TripMember[] = [
      {
        tripMemberId: 'm1',
        userId: 'u2',
        name: 'Bob',
        email: 'bob@travelease.test',
        memberStatus: 'ACCEPTED',
        joinedDate: '2026-06-02T00:00:00Z',
        budgetAmount: 0,
        spentAmount: 0,
      },
    ];
    const fixture = await render(members);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Suitable for Group');
  });

  it('hides the Suitable for Group badge when the trip has more members than any bus has seats', async () => {
    const members: TripMember[] = Array.from({ length: 10 }, (_, i) => ({
      tripMemberId: `m${i}`,
      userId: `u${i}`,
      name: `Member ${i}`,
      email: `m${i}@travelease.test`,
      memberStatus: 'ACCEPTED' as const,
      joinedDate: '2026-06-02T00:00:00Z',
      budgetAmount: 0,
      spentAmount: 0,
    }));
    const fixture = await render(members);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Suitable for Group');
  });

  it('renders exactly 30 seats in the allocation grid', async () => {
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
