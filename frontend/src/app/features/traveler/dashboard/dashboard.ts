import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { TripsDummyService } from '@app/core/services/trips-dummy.service';
import { NotificationsDummyService } from '@app/core/services/notifications-dummy.service';
import { Trip } from '@app/core/models/trip.model';
import { Notification } from '@app/core/models/notification.model';
import { StatCard } from '@app/shared/components/stat-card/stat-card';
import { StatusBadge } from '@app/shared/components/status-badge/status-badge';
import { MOCK_BUDGET_SUMMARY, MOCK_ITINERARY } from '@app/core/data/mock-data';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, NgIconComponent, HlmButtonImports, HlmBadgeImports, HlmSkeletonImports, StatCard, StatusBadge],
  template: `
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-bold">Good afternoon, Arjun 👋</h1>
          <p class="text-muted-foreground mt-0.5">Here's what's happening with your trips.</p>
        </div>
        <a hlmBtn routerLink="/trips/new">
          <ng-icon name="lucidePlus" size="14" class="mr-1.5" />
          New Trip
        </a>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <app-stat-card label="Active Trips" value="1" icon="lucideMapPin"
                       iconBg="oklch(0.93 0.05 185)" iconColor="var(--primary)" [trend]="50" />
        <app-stat-card label="Upcoming Trips" value="2" icon="lucideCalendar"
                       iconBg="oklch(0.94 0.04 250)" iconColor="oklch(0.5 0.15 250)" />
        <app-stat-card label="Total Spent" value="₹23,700" icon="lucideReceipt"
                       iconBg="oklch(0.95 0.04 75)" iconColor="oklch(0.6 0.15 75)" />
        <app-stat-card label="Pending Invites" value="2" icon="lucideMail"
                       iconBg="oklch(0.95 0.03 30)" iconColor="oklch(0.6 0.13 30)" />
      </div>

      <!-- Main grid -->
      <div class="grid lg:grid-cols-3 gap-6">
        <!-- Trips section -->
        <div class="lg:col-span-2 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold">My Trips</h2>
            <a routerLink="/trips" class="text-sm text-primary hover:underline">View all</a>
          </div>

          @if (loading()) {
            <div class="space-y-3">
              @for (_ of [1,2]; track $index) {
                <div class="bg-card border border-border rounded-xl p-4">
                  <div class="flex gap-4">
                    <hlm-skeleton class="w-16 h-16 rounded-lg flex-shrink-0" />
                    <div class="flex-1 space-y-2">
                      <hlm-skeleton class="h-4 w-3/4 rounded" />
                      <hlm-skeleton class="h-3 w-1/2 rounded" />
                      <hlm-skeleton class="h-3 w-2/3 rounded" />
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="space-y-3">
              @for (trip of trips().slice(0, 3); track trip.id) {
                <a [routerLink]="['/trips', trip.id]"
                   class="block bg-card border border-border rounded-xl p-4 hover:shadow-sm hover:border-primary/30 transition-all group">
                  <div class="flex gap-4">
                    @if (trip.coverImage) {
                      <img [src]="trip.coverImage" [alt]="trip.name"
                           class="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                    } @else {
                      <div class="w-16 h-16 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                        <ng-icon name="lucideMapPin" size="20" class="text-primary" />
                      </div>
                    }
                    <div class="flex-1 min-w-0">
                      <div class="flex items-start justify-between gap-2">
                        <div class="font-semibold text-sm truncate group-hover:text-primary transition-colors">{{ trip.name }}</div>
                        <app-status-badge [status]="trip.status" />
                      </div>
                      <div class="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <ng-icon name="lucideMapPin" size="10" />
                        {{ trip.source }} → {{ trip.destination }}
                      </div>
                      <div class="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <ng-icon name="lucideCalendar" size="10" />
                        {{ trip.startDate | date }} – {{ trip.endDate | date }}
                      </div>
                      <div class="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <ng-icon name="lucideUsers" size="10" />
                        {{ trip.memberCount }} members · {{ trip.travelerCategory }}
                      </div>
                    </div>
                  </div>
                </a>
              }
            </div>
          }
        </div>

        <!-- Right panel -->
        <div class="space-y-6">
          <!-- Budget Snapshot -->
          <div class="bg-card border border-border rounded-xl p-4">
            <h3 class="text-sm font-semibold mb-3 flex items-center gap-2">
              <ng-icon name="lucideWallet" size="14" class="text-primary" />
              Budget Snapshot
            </h3>
            <div class="text-2xl font-bold">₹23,700</div>
            <div class="text-xs text-muted-foreground mb-3">of ₹45,000 budget used</div>
            <div class="h-2 bg-muted rounded-full overflow-hidden">
              <div class="h-full bg-primary rounded-full transition-all" style="width: 52.7%"></div>
            </div>
            <div class="flex justify-between text-xs text-muted-foreground mt-2">
              <span>52.7% used</span>
              <span class="text-green-600 font-medium">₹21,300 left</span>
            </div>
            <a routerLink="/trips/trip1/budget" class="text-xs text-primary hover:underline mt-2 block">View budget details →</a>
          </div>

          <!-- Upcoming Activities -->
          <div class="bg-card border border-border rounded-xl p-4">
            <h3 class="text-sm font-semibold mb-3 flex items-center gap-2">
              <ng-icon name="lucideCalendarDays" size="14" class="text-primary" />
              Upcoming Activities
            </h3>
            <div class="space-y-3">
              @for (activity of upcomingActivities; track activity.id) {
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                       [style.background]="activity.completed ? 'oklch(0.93 0.05 145)' : 'oklch(0.93 0.05 185)'">
                    <ng-icon [name]="activity.completed ? 'lucideCheckCircle' : 'lucideClock'" size="14"
                             [class]="activity.completed ? 'text-green-600' : 'text-primary'" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-medium truncate">{{ activity.activityName }}</div>
                    <div class="text-xs text-muted-foreground">{{ activity.date }} at {{ activity.startTime }}</div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Notifications teaser -->
          <div class="bg-card border border-border rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-semibold flex items-center gap-2">
                <ng-icon name="lucideBell" size="14" class="text-primary" />
                Notifications
              </h3>
              <a routerLink="/notifications" class="text-xs text-primary hover:underline">View all</a>
            </div>
            <div class="space-y-2">
              @for (notif of notifications().slice(0, 3); track notif.id) {
                <div class="flex items-start gap-2 py-1.5">
                  <div class="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                       [class]="notif.read ? 'bg-muted-foreground/30' : 'bg-primary'"></div>
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-medium truncate">{{ notif.title }}</div>
                    <div class="text-xs text-muted-foreground truncate">{{ notif.message }}</div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class Dashboard implements OnInit {
  private readonly tripsService = inject(TripsDummyService);
  private readonly notificationsService = inject(NotificationsDummyService);

  readonly loading = signal(true);
  readonly trips = signal<Trip[]>([]);
  readonly notifications = signal<Notification[]>([]);

  readonly upcomingActivities = MOCK_ITINERARY.activities.filter(a => !a.completed).slice(0, 3);

  ngOnInit(): void {
    this.tripsService.getMyTrips().subscribe(trips => {
      this.trips.set(trips);
      this.loading.set(false);
    });
    this.notificationsService.getNotifications().subscribe(n => this.notifications.set(n));
  }
}
