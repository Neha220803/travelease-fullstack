import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TripTravelTab } from '@app/features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { AuthService } from '@app/core/auth/auth.service';
import { Trip, TripMember } from '@app/features/trips/services/trip.models';

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

const MEMBERS: TripMember[] = [
  { tripMemberId: 'm1', userId: 'u2', name: 'Bob', email: 'bob@travelease.test', memberStatus: 'ACCEPTED', joinedDate: '2026-06-02T00:00:00Z', budgetAmount: 0, spentAmount: 0 },
];

const BOOKING = {
  bookingId: 10,
  bookingReference: 'BK10',
  status: 'CONFIRMED',
  totalFare: 1800,
  scheduleId: 1,
  travelDate: '2026-07-12',
  source: 'Bengaluru',
  destination: 'Goa',
  bookedByUserId: 'u1',
  travelerTripId: 't1',
};

async function render(bookings = [BOOKING]) {
  await TestBed.configureTestingModule({
    imports: [TripTravelTab],
    providers: [
      {
        provide: BookingService,
        useValue: {
          getTripBusBookings: () => of({ tripId: 't1', bookingCount: bookings.length, totalFare: 1800, bookings }),
          removeBookingFromTrip: vi.fn(() => of(undefined)),
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
    expect(text).toContain('BK10');
    expect(text).not.toContain('Detach');
  });
});
