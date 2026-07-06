import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HotelProviderDummyService } from '@app/core/services/hotel-provider-dummy.service';
import { StatCard } from '@app/shared/components/stat-card/stat-card';

@Component({
  selector: 'app-hotel-dashboard',
  imports: [RouterLink, DecimalPipe, NgIconComponent, HlmButtonImports, HlmSkeletonImports, StatCard],
  template: `
    <div class="space-y-8">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-bold">Hotel Provider Dashboard</h1>
          <p class="text-muted-foreground text-sm mt-0.5">Manage your properties and bookings</p>
        </div>
        <a hlmBtn routerLink="/hotel/properties">
          <ng-icon name="lucidePlus" size="14" class="mr-1.5" />New Property
        </a>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <app-stat-card label="Properties" value="2" icon="lucideBuilding2"
                       iconBg="oklch(0.95 0.04 30)" iconColor="oklch(0.6 0.13 30)" />
        <app-stat-card label="Active Bookings" [value]="bookings().length" icon="lucideCalendarCheck"
                       iconBg="oklch(0.93 0.05 185)" iconColor="var(--primary)" />
        <app-stat-card label="Revenue (Jun)" value="₹3.4L" icon="lucideDollarSign"
                       iconBg="oklch(0.95 0.04 145)" iconColor="oklch(0.5 0.14 145)" [trend]="12" />
        <app-stat-card label="Avg Rating" value="4.5★" icon="lucideStar"
                       iconBg="oklch(0.95 0.05 75)" iconColor="oklch(0.6 0.15 75)" />
      </div>

      <!-- Recent bookings -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold">Recent Bookings</h2>
          <a routerLink="/hotel/bookings" class="text-sm text-primary hover:underline">View all</a>
        </div>
        <div class="space-y-3">
          @for (b of bookings().slice(0, 3); track b.id) {
            <div class="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <ng-icon name="lucideHotel" size="18" class="text-amber-600" />
              </div>
              <div class="flex-1">
                <div class="font-medium text-sm">{{ b.hotelName }}</div>
                <div class="text-xs text-muted-foreground">{{ b.checkIn }} – {{ b.checkOut }} · {{ b.guestCount }} guests</div>
              </div>
              <div class="text-right">
                <div class="font-bold text-sm">₹{{ b.totalAmount | number }}</div>
                <div class="text-xs text-green-600">{{ b.status }}</div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class HotelDashboard implements OnInit {
  private readonly service = inject(HotelProviderDummyService);
  readonly bookings = signal<any[]>([]);
  ngOnInit(): void { this.service.getBookings().subscribe(b => this.bookings.set(b)); }
}
