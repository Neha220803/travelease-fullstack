import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import {
  lucideAlertTriangle,
  lucideArrowLeft,
  lucideArrowRight,
  lucideBus,
  lucideCalendar,
  lucideCheckCircle2,
  lucideClock,
  lucideMapPin,
  lucidePlus,
  lucideSparkles,
  lucideStar,
  lucideUserPlus,
  lucideUsers,
  lucideWallet,
} from '@ng-icons/lucide';
import { Subject, of, throwError } from 'rxjs';
import { TripDetail } from '@app/features/trips/components/trip-detail/trip-detail';
import { TripsService } from '@app/features/trips/services/trips.service';
import { ScheduleService } from '@app/features/bus-booking/services/schedule.service';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { ItineraryService } from '@app/features/trips/services/itinerary.service';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { ActivitiesService } from '@app/core/activities/activities.service';
import { RecommendationsService } from '@app/core/recommendations/recommendations.service';
import { HotelsService } from '@app/core/hotels/hotels.service';
import { AccommodationService } from '@app/features/trips/services/accommodation.service';
import { Trip, TripMember } from '@app/features/trips/services/trip.models';
import { Destination } from '@app/core/destinations/destination.models';
import { UsersService } from '@app/core/users/users.service';

const ALL_ICONS = {
  lucideAlertTriangle,
  lucideArrowLeft,
  lucideArrowRight,
  lucideBus,
  lucideCalendar,
  lucideCheckCircle2,
  lucideClock,
  lucideMapPin,
  lucidePlus,
  lucideSparkles,
  lucideStar,
  lucideUserPlus,
  lucideUsers,
  lucideWallet,
};

const SAMPLE_TRIP: Trip = {
  tripId: 'goa-2026',
  tripName: 'Goa Beach Escape',
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

const SAMPLE_MEMBERS: TripMember[] = [
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

const SAMPLE_DESTINATIONS: Destination[] = [
  { destinationId: 2, destinationName: 'Goa', state: 'Goa', country: 'India', description: '' },
];

async function renderWithTripId(
  tripId: string | null,
  queryParams: Record<string, string> = {},
  overrides: Partial<TripsService> = {},
) {
  await TestBed.configureTestingModule({
    imports: [TripDetail],
    providers: [
      provideRouter([]),
      provideIcons(ALL_ICONS),
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(convertToParamMap(tripId ? { tripId } : {})),
          queryParamMap: of(convertToParamMap(queryParams)),
        },
      },
      {
        provide: TripsService,
        useValue: {
          getTripById: () => of(SAMPLE_TRIP),
          getTripMembers: () => of(SAMPLE_MEMBERS),
          getBudgetSummary: () =>
            of({
              tripId: 'goa-2026',
              totalBudget: 40000,
              totalSpent: 0,
              remainingBudget: 40000,
              utilizationPercentage: 0,
              overspent: false,
            }),
          ...overrides,
        },
      },
      { provide: DestinationsService, useValue: { listDestinations: () => of(SAMPLE_DESTINATIONS) } },
      { provide: UsersService, useValue: { searchTravelers: () => of([]) } },
      // TripDetail's template renders every tab eagerly (not just the active
      // one), so the Overview/Travel/Itinerary tabs' own ngOnInit fetches run
      // unconditionally during fixture.detectChanges() below. Without these
      // stubs they'd fall through to the real, HttpClient-backed services and
      // either throw (methods missing from a partial stub) or fire real
      // network calls against http://localhost:8080 during this component's
      // tests, which only care about TripDetail's own hero/tabs behavior.
      {
        provide: ScheduleService,
        useValue: {
          searchBuses: () => of([]),
        },
      },
      {
        provide: BookingService,
        useValue: {
          getTripBusBookings: () => of({ tripId: 'goa-2026', bookingCount: 0, totalFare: 0, bookings: [] }),
          createBooking: () => of(null),
          attachBookingToTrip: () => of(null),
        },
      },
      { provide: ActivitiesService, useValue: { getActivities: () => of([]), getProviders: () => of([]) } },
      { provide: RecommendationsService, useValue: { getRecommendations: () => of([]) } },
      { provide: HotelsService, useValue: { searchHotels: () => of([]) } },
      {
        provide: AccommodationService,
        useValue: {
          getAccommodationSummary: () => of({ tripId: 'goa-2026', bookingCount: 0, totalAmount: 0, bookings: [] }),
        },
      },
      {
        provide: ItineraryService,
        useValue: {
          list: () => of([]),
          create: () => of(null),
          getProgress: () =>
            of({
              tripId: 'goa-2026',
              totalActivities: 0,
              completedActivities: 0,
              pendingActivities: 0,
              completionPercentage: 0,
            }),
          progressFor: () => null,
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(TripDetail);
  fixture.detectChanges();
  return fixture;
}

function activeTab(fixture: ReturnType<typeof TestBed.createComponent<TripDetail>>): string {
  return (fixture.componentInstance as unknown as { activeTab: () => string }).activeTab();
}

describe('TripDetail', () => {
  it('shows a loading message before the trip arrives', async () => {
    const subject = new Subject<Trip>();
    const fixture = await renderWithTripId('goa-2026', {}, { getTripById: () => subject.asObservable() });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading trip');
  });

  it('fetches the trip matching the route tripId and renders its name', async () => {
    const fixture = await renderWithTripId('goa-2026');
    expect(fixture.componentInstance.trip()).toEqual(SAMPLE_TRIP);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Goa Beach Escape');
  });

  it('shows an error message when loading the trip fails', async () => {
    const fixture = await renderWithTripId(
      'goa-2026',
      {},
      { getTripById: () => throwError(() => new Error('boom')) },
    );
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Something went wrong');
  });

  it('resolves the destination id to a name in the hero', async () => {
    const fixture = await renderWithTripId('goa-2026');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Goa');
  });

  it('shows the member count in the hero', async () => {
    const fixture = await renderWithTripId('goa-2026');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('1 members');
  });

  it('renders all 8 tab triggers', async () => {
    const fixture = await renderWithTripId('goa-2026');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const label of [
      'Overview',
      'Members',
      'Travel',
      'Accommodation',
      'Expenses',
      'Itinerary',
      'Alerts',
      'Reviews',
    ]) {
      expect(text).toContain(label);
    }
  });

  it('defaults activeTab to overview when no tab query param is present', async () => {
    const fixture = await renderWithTripId('goa-2026');
    expect(activeTab(fixture)).toBe('overview');
  });

  it('seeds activeTab from a recognized tab query param', async () => {
    const fixture = await renderWithTripId('goa-2026', { tab: 'members' });
    expect(activeTab(fixture)).toBe('members');
  });

  it('falls back to overview for an unrecognized tab query param value', async () => {
    const fixture = await renderWithTripId('goa-2026', { tab: 'not-a-real-tab' });
    expect(activeTab(fixture)).toBe('overview');
  });
});
