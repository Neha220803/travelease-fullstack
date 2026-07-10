import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { TripsService } from '@app/features/trips/services/trips.service';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { ItineraryService } from '@app/features/trips/services/itinerary.service';
import { ActivitiesService } from '@app/core/activities/activities.service';
import { Activity } from '@app/core/activities/activity.models';
import { RecommendationsService } from '@app/core/recommendations/recommendations.service';
import { BudgetSummary, Trip, TripMember } from '@app/features/trips/services/trip.models';

interface TimelineStep {
  label: string;
  done: boolean;
  date: string;
}

interface StatCard {
  label: string;
  value: string;
  icon: string;
}

interface RecommendedActivityCard {
  id: string;
  name: string;
  duration: string;
}

@Component({
  selector: 'app-trip-overview-tab',
  imports: [NgIcon, HlmCardImports, HlmButtonImports, HlmBadgeImports, HlmProgressImports],
  templateUrl: './trip-overview-tab.html',
})
export class TripOverviewTab implements OnInit {
  public readonly trip = input.required<Trip>();
  public readonly members = input.required<TripMember[]>();

  private readonly tripsService = inject(TripsService);
  private readonly bookingService = inject(BookingService);
  private readonly itineraryService = inject(ItineraryService);
  private readonly activitiesService = inject(ActivitiesService);
  private readonly recommendationsService = inject(RecommendationsService);

  protected readonly budgetSummary = signal<BudgetSummary | null>(null);
  protected readonly busBooked = signal(false);
  protected readonly itineraryFinalized = signal(false);
  protected readonly recommendedActivities = signal<RecommendedActivityCard[]>([]);

  protected readonly pct = computed(() => Math.round(this.budgetSummary()?.utilizationPercentage ?? 0));

  protected readonly stats = computed<StatCard[]>(() => {
    const trip = this.trip();
    const summary = this.budgetSummary();
    return [
      { label: 'Total Members', value: String(this.members().length), icon: 'lucideUsers' },
      {
        label: 'Trip Budget',
        value: `₹${(summary?.totalBudget ?? trip.budgetAmount).toLocaleString()}`,
        icon: 'lucideWallet',
      },
      { label: 'Current Cost', value: `₹${(summary?.totalSpent ?? 0).toLocaleString()}`, icon: 'lucideWallet' },
      {
        label: 'Remaining',
        value: `₹${(summary?.remainingBudget ?? trip.budgetAmount).toLocaleString()}`,
        icon: 'lucideWallet',
      },
      { label: 'Status', value: trip.status, icon: 'lucideCheckCircle2' },
    ];
  });

  protected readonly timelineSteps = computed<TimelineStep[]>(() => {
    const trip = this.trip();
    const membersAccepted = this.members().some((m) => m.memberStatus === 'ACCEPTED');
    const tripStarted = new Date(trip.startDate).getTime() <= Date.now();
    return [
      { label: 'Trip Created', done: true, date: trip.createdAt },
      { label: 'Members Invited', done: membersAccepted, date: trip.startDate },
      { label: 'Bus Booked', done: this.busBooked(), date: trip.startDate },
      { label: 'Itinerary Finalized', done: this.itineraryFinalized(), date: trip.startDate },
      { label: 'Trip Begins', done: tripStarted, date: trip.startDate },
    ];
  });

  ngOnInit(): void {
    const trip = this.trip();

    this.tripsService.getBudgetSummary(trip.tripId).subscribe({
      next: (summary) => this.budgetSummary.set(summary),
      error: () => {
        // Falls back to trip.budgetAmount in the stats/computed above.
      },
    });

    this.bookingService.getTripBusBookings(trip.tripId).subscribe({
      next: (summary) => this.busBooked.set(summary.bookingCount > 0),
      error: () => {
        // Stays "not done" — a fair default when we can't confirm a booking.
      },
    });

    this.itineraryService.getProgress(trip.tripId).subscribe({
      next: (progress) => this.itineraryFinalized.set(progress.completionPercentage === 100),
      error: () => {
        // Stays "not done".
      },
    });

    this.recommendationsService.getRecommendations(trip.categoryId).subscribe({
      next: (recommendations) => {
        const activityRefIds = recommendations
          .filter((r) => r.recommendationType === 'Activity')
          .map((r) => r.referenceId);
        if (activityRefIds.length === 0) {
          return;
        }
        this.activitiesService.getActivities(trip.destinationId).subscribe({
          next: (activities) => {
            const byId = new Map(activities.map((a) => [a.activityId, a]));
            this.recommendedActivities.set(
              activityRefIds
                .map((id) => byId.get(id))
                .filter((a): a is Activity => !!a)
                .slice(0, 4)
                .map((a) => ({ id: a.activityId, name: a.activityName, duration: `${a.durationHours} hr` })),
            );
          },
          error: () => {
            // Recommended activities section just stays empty.
          },
        });
      },
      error: () => {
        // Recommended activities section just stays empty.
      },
    });
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  }
}
