import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { ActivityProviderDummyService } from '@app/core/services/activity-provider-dummy.service';
import { StatCard } from '@app/shared/components/stat-card/stat-card';

@Component({
  selector: 'app-activity-dashboard',
  imports: [RouterLink, DecimalPipe, NgIconComponent, HlmButtonImports, StatCard],
  template: `
    <div class="space-y-8">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-bold">Activity Provider Dashboard</h1>
          <p class="text-muted-foreground text-sm mt-0.5">Manage your activities and capacity</p>
        </div>
        <a hlmBtn routerLink="/activity/activities">
          <ng-icon name="lucidePlus" size="14" class="mr-1.5" />New Activity
        </a>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <app-stat-card label="Activities" [value]="activities().length" icon="lucideActivity"
                       iconBg="oklch(0.93 0.05 145)" iconColor="oklch(0.5 0.14 145)" />
        <app-stat-card label="Bookings" [value]="bookings().length" icon="lucideCalendarCheck"
                       iconBg="oklch(0.93 0.05 185)" iconColor="var(--primary)" />
        <app-stat-card label="Revenue (Jun)" value="₹1.1L" icon="lucideDollarSign"
                       iconBg="oklch(0.95 0.04 145)" iconColor="oklch(0.5 0.14 145)" [trend]="15" />
        <app-stat-card label="Fill Rate" value="76%" icon="lucideTarget"
                       iconBg="oklch(0.95 0.03 30)" iconColor="oklch(0.6 0.12 30)" />
      </div>

      <!-- Activities list -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold">Activities</h2>
          <a routerLink="/activity/activities" class="text-sm text-primary hover:underline">Manage all</a>
        </div>
        <div class="space-y-3">
          @for (a of activities(); track a.id) {
            <div class="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div class="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <ng-icon name="lucideActivity" size="18" class="text-green-600" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm truncate">{{ a.name }}</div>
                <div class="text-xs text-muted-foreground">{{ a.category }} · {{ a.destinationName }} · ₹{{ a.price | number }}</div>
              </div>
              <div class="text-right flex-shrink-0">
                <div class="text-sm font-medium">{{ a.availableSlots }}/{{ a.maxCapacity }}</div>
                <div class="text-xs text-muted-foreground">available</div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class ActivityDashboard implements OnInit {
  private readonly service = inject(ActivityProviderDummyService);
  readonly activities = signal<any[]>([]);
  readonly bookings = signal<any[]>([]);
  ngOnInit(): void {
    this.service.getActivities().subscribe(a => this.activities.set(a));
    this.service.getBookings().subscribe(b => this.bookings.set(b));
  }
}
