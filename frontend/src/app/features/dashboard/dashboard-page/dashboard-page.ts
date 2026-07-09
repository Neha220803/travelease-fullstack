import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { DestinationPill } from '@app/shared/ui/destination-pill/destination-pill';
import { TripsService } from '@app/features/trips/services/trips.service';
import { NotificationService } from '@app/features/notifications/services/notification.service';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { Trip, PendingInvitation } from '@app/features/trips/services/trip.models';
import { NotificationResponse } from '@app/features/notifications/services/notification.models';
import { Destination } from '@app/core/destinations/destination.models';

interface StatCard {
  label: string;
  value: string;
  hint: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmProgressImports,
    HlmAvatarImports,
    StatusBadge,
    DestinationPill,
  ],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage implements OnInit {
  private readonly tripsService = inject(TripsService);
  private readonly notificationService = inject(NotificationService);
  private readonly destinationsService = inject(DestinationsService);

  public readonly upcomingTrips = signal<Trip[]>([]);
  public readonly invitations = signal<PendingInvitation[]>([]);
  public readonly notifications = signal<NotificationResponse[]>([]);
  public readonly stats = signal<StatCard[]>([]);
  public readonly destinations = signal<Destination[]>([]);

  public readonly nearestTrip = signal<Trip | null>(null);
  public readonly daysToNearest = signal<number | null>(null);

  ngOnInit() {
    this.destinationsService.listDestinations().subscribe((dests) => {
      this.destinations.set(dests);
    });

    this.tripsService.listMyTrips().subscribe((trips) => {
      const active = trips.filter((t) => t.status === 'PLANNING' || t.status === 'CONFIRMED' || t.status === 'ONGOING');
      this.upcomingTrips.set(active);

      if (active.length > 0) {
        // Sort by start date to find the nearest
        const sorted = [...active].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        const nearest = sorted[0];
        this.nearestTrip.set(nearest);
        
        const diffTime = new Date(nearest.startDate).getTime() - new Date().getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        this.daysToNearest.set(diffDays > 0 ? diffDays : 0);
      }

      this.updateStats();
    });

    this.tripsService.getPendingInvitations().subscribe((invites) => {
      this.invitations.set(invites);
      this.updateStats();
    });

    this.notificationService.getNotifications().subscribe((notifs) => {
      // Show top 5 recent notifications
      this.notifications.set(notifs.slice(0, 5));
    });
  }

  private updateStats() {
    const activeCount = this.upcomingTrips().length;
    const invitesCount = this.invitations().length;
    const nearest = this.nearestTrip();
    
    const newStats: StatCard[] = [
      { label: 'Active Trips', value: activeCount.toString(), hint: `${activeCount} upcoming/ongoing`, icon: 'lucidePlane' },
      { label: 'Pending Invites', value: invitesCount.toString(), hint: invitesCount ? 'Respond soon' : 'All caught up', icon: 'lucideUsers' },
    ];

    if (nearest) {
      const dateStr = new Date(nearest.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      newStats.push({ label: 'Next Trip', value: `${this.daysToNearest()}d`, hint: `${nearest.tripName} · ${dateStr}`, icon: 'lucideCalendar' });
    }

    this.stats.set(newStats);
  }

  public destinationIdToLabel(id: number): string {
    const d = this.destinations().find((dest) => dest.destinationId === id);
    return d ? `${d.destinationName}, ${d.state}` : id.toString();
  }
}
