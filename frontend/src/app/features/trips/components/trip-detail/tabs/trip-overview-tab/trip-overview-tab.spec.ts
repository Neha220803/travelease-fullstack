import { TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import {
  lucideAlertTriangle,
  lucideCheckCircle2,
  lucidePlus,
  lucideSparkles,
  lucideUsers,
  lucideWallet,
} from '@ng-icons/lucide';
import { of } from 'rxjs';
import { TripOverviewTab } from '@app/features/trips/components/trip-detail/tabs/trip-overview-tab/trip-overview-tab';
import { TripsService } from '@app/features/trips/services/trips.service';
import { ScheduleService } from '@app/features/trips/services/schedule.service';
import { ItineraryService } from '@app/features/trips/services/itinerary.service';
import { ActivitiesService } from '@app/core/activities/activities.service';
import { RecommendationsService } from '@app/core/recommendations/recommendations.service';
import { Trip, TripMember, BudgetSummary } from '@app/features/trips/services/trip.models';

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

const SUMMARY: BudgetSummary = {
  tripId: 't1',
  totalBudget: 40000,
  totalSpent: 10000,
  remainingBudget: 30000,
  utilizationPercentage: 25,
  overspent: false,
};

async function render(overrides: {
  budgetSummary?: BudgetSummary;
  busBookingCount?: number;
  completionPercentage?: number;
} = {}) {
  await TestBed.configureTestingModule({
    imports: [TripOverviewTab],
    providers: [
      provideIcons({
        lucideAlertTriangle,
        lucideCheckCircle2,
        lucidePlus,
        lucideSparkles,
        lucideUsers,
        lucideWallet,
      }),
      {
        provide: TripsService,
        useValue: { getBudgetSummary: () => of(overrides.budgetSummary ?? SUMMARY) },
      },
      {
        provide: ScheduleService,
        useValue: {
          getTripBusBookings: () =>
            of({ tripId: 't1', bookingCount: overrides.busBookingCount ?? 0, totalFare: 0, bookings: [] }),
        },
      },
      {
        provide: ItineraryService,
        useValue: {
          getProgress: () =>
            of({
              tripId: 't1',
              totalActivities: 4,
              completedActivities: overrides.completionPercentage === 100 ? 4 : 0,
              pendingActivities: 0,
              completionPercentage: overrides.completionPercentage ?? 0,
            }),
        },
      },
      { provide: RecommendationsService, useValue: { getRecommendations: () => of([]) } },
      { provide: ActivitiesService, useValue: { getActivities: () => of([]) } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(TripOverviewTab);
  fixture.componentRef.setInput('trip', TRIP);
  fixture.componentRef.setInput('members', MEMBERS);
  fixture.detectChanges();
  return fixture;
}

interface TimelineStep {
  label: string;
  done: boolean;
  date: string;
}

function timelineSteps(fixture: ReturnType<typeof TestBed.createComponent<TripOverviewTab>>): TimelineStep[] {
  return (fixture.componentInstance as unknown as { timelineSteps: () => TimelineStep[] }).timelineSteps();
}

describe('TripOverviewTab', () => {
  it('renders the 5 stat cards from the members input and the budget summary', async () => {
    const fixture = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Total Members');
    expect(text).toContain('1');
    expect(text).toContain('₹40,000');
    expect(text).toContain('₹10,000');
    expect(text).toContain('CONFIRMED');
  });

  it('shows the budget warning when utilizationPercentage is over 80', async () => {
    const fixture = await render({
      budgetSummary: { ...SUMMARY, utilizationPercentage: 95 },
    });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Budget nearing limit');
  });

  it('hides the budget warning when utilizationPercentage is 80 or under', async () => {
    const fixture = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Budget nearing limit');
  });

  it('marks Bus Booked done when the trip has at least one bus booking', async () => {
    const fixture = await render({ busBookingCount: 1 });
    const steps = timelineSteps(fixture);
    expect(steps.find((s) => s.label === 'Bus Booked')?.done).toBe(true);
  });

  it('marks Itinerary Finalized done only at 100% completion', async () => {
    const fixture = await render({ completionPercentage: 100 });
    const steps = timelineSteps(fixture);
    expect(steps.find((s) => s.label === 'Itinerary Finalized')?.done).toBe(true);
  });

  it('does not include a Hotel Selected timeline step', async () => {
    const fixture = await render();
    const steps = timelineSteps(fixture);
    expect(steps.some((s) => s.label === 'Hotel Selected')).toBe(false);
  });
});
