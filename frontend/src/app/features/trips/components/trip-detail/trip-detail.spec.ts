import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
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
  const router = TestBed.inject(Router);
  const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  fixture.detectChanges();
  return { fixture, navigateSpy };
}

function instance(fixture: ReturnType<typeof TestBed.createComponent<TripDetail>>) {
  return fixture.componentInstance as unknown as {
    deleteDialogState: () => 'open' | 'closed';
    deleting: () => boolean;
    deleteError: () => string | null;
    deleteBlocked: () => boolean;
    cancelling: () => boolean;
    onDeleteClick: () => void;
    onCancelDeleteDialog: () => void;
    onConfirmDelete: () => void;
    onCancelTripInstead: () => void;
  };
}

function activeTab(fixture: ReturnType<typeof TestBed.createComponent<TripDetail>>): string {
  return (fixture.componentInstance as unknown as { activeTab: () => string }).activeTab();
}

describe('TripDetail', () => {
  it('shows a loading message before the trip arrives', async () => {
    const subject = new Subject<Trip>();
    const { fixture } = await renderWithTripId('goa-2026', {}, { getTripById: () => subject.asObservable() });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading trip');
  });

  it('fetches the trip matching the route tripId and renders its name', async () => {
    const { fixture } = await renderWithTripId('goa-2026');
    expect(fixture.componentInstance.trip()).toEqual(SAMPLE_TRIP);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Goa Beach Escape');
  });

  it('shows an error message when loading the trip fails', async () => {
    const { fixture } = await renderWithTripId(
      'goa-2026',
      {},
      { getTripById: () => throwError(() => new Error('boom')) },
    );
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Something went wrong');
  });

  it('resolves the destination id to a name in the hero', async () => {
    const { fixture } = await renderWithTripId('goa-2026');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Goa');
  });

  it('shows the member count in the hero', async () => {
    const { fixture } = await renderWithTripId('goa-2026');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('1 members');
  });

  it('renders all 8 tab triggers', async () => {
    const { fixture } = await renderWithTripId('goa-2026');
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
    const { fixture } = await renderWithTripId('goa-2026');
    expect(activeTab(fixture)).toBe('overview');
  });

  it('seeds activeTab from a recognized tab query param', async () => {
    const { fixture } = await renderWithTripId('goa-2026', { tab: 'members' });
    expect(activeTab(fixture)).toBe('members');
  });

  it('falls back to overview for an unrecognized tab query param value', async () => {
    const { fixture } = await renderWithTripId('goa-2026', { tab: 'not-a-real-tab' });
    expect(activeTab(fixture)).toBe('overview');
  });

  it('shows an Edit Trip and Delete Trip action for the organizer', async () => {
    const { fixture } = await renderWithTripId('goa-2026');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Edit Trip');
    expect(text).toContain('Delete Trip');
  });

  it('deletes the trip and navigates back to the trips list on success', async () => {
    const deleteTrip = vi.fn().mockReturnValue(of(undefined));
    const { fixture, navigateSpy } = await renderWithTripId('goa-2026', {}, { deleteTrip });

    instance(fixture).onDeleteClick();
    expect(instance(fixture).deleteDialogState()).toBe('open');

    instance(fixture).onConfirmDelete();
    await fixture.whenStable();

    expect(deleteTrip).toHaveBeenCalledWith('goa-2026');
    expect(instance(fixture).deleteDialogState()).toBe('closed');
    expect(navigateSpy).toHaveBeenCalledWith(['/trips']);
  });

  it('offers to cancel the trip instead when the hard delete is blocked', async () => {
    const deleteTrip = vi.fn().mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { success: false, data: null, error: { code: 'INVALID_REQUEST', message: 'Trip has bookings attached' } },
          }),
      ),
    );
    const { fixture, navigateSpy } = await renderWithTripId('goa-2026', {}, { deleteTrip });

    instance(fixture).onDeleteClick();
    instance(fixture).onConfirmDelete();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(instance(fixture).deleteBlocked()).toBe(true);
    expect(instance(fixture).deleteError()).toContain('Trip has bookings attached');
    expect(navigateSpy).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cancel Trip Instead');
  });

  it('cancels the trip instead when the organizer confirms the fallback', async () => {
    const deleteTrip = vi.fn().mockReturnValue(throwError(() => new Error('blocked')));
    const cancelledTrip: Trip = { ...SAMPLE_TRIP, status: 'CANCELLED' };
    const transitionStatus = vi.fn().mockReturnValue(of(cancelledTrip));
    const { fixture } = await renderWithTripId('goa-2026', {}, { deleteTrip, transitionStatus });

    instance(fixture).onDeleteClick();
    instance(fixture).onConfirmDelete();
    await fixture.whenStable();

    instance(fixture).onCancelTripInstead();
    await fixture.whenStable();

    expect(transitionStatus).toHaveBeenCalledWith('goa-2026', 'CANCELLED');
    expect(instance(fixture).deleteDialogState()).toBe('closed');
    expect(fixture.componentInstance.trip()?.status).toBe('CANCELLED');
  });
});
