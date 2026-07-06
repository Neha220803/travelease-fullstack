import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { TransportProviderDummyService } from '@app/core/services/transport-provider-dummy.service';
import { StatCard } from '@app/shared/components/stat-card/stat-card';

@Component({
  selector: 'app-transport-dashboard',
  imports: [RouterLink, DecimalPipe, NgIconComponent, HlmButtonImports, HlmSkeletonImports, StatCard],
  template: `
    <div class="space-y-8">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-bold">Transport Provider Dashboard</h1>
          <p class="text-muted-foreground text-sm mt-0.5">Manage your fleet and bookings</p>
        </div>
        <a hlmBtn routerLink="/transport/vehicles">
          <ng-icon name="lucidePlus" size="14" class="mr-1.5" />Add Vehicle
        </a>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <app-stat-card label="Vehicles" [value]="vehicles().length" icon="lucideBus"
                       iconBg="oklch(0.93 0.04 250)" iconColor="oklch(0.5 0.15 250)" />
        <app-stat-card label="Active Bookings" [value]="bookings().length" icon="lucideCalendarCheck"
                       iconBg="oklch(0.93 0.05 185)" iconColor="var(--primary)" />
        <app-stat-card label="Revenue (Jun)" value="₹1.55L" icon="lucideDollarSign"
                       iconBg="oklch(0.95 0.04 145)" iconColor="oklch(0.5 0.14 145)" [trend]="8" />
        <app-stat-card label="Passengers" value="1,080" icon="lucideUsers"
                       iconBg="oklch(0.95 0.03 30)" iconColor="oklch(0.6 0.12 30)" />
      </div>

      <!-- Fleet summary -->
      <div class="bg-card border border-border rounded-xl p-5">
        <h2 class="text-sm font-semibold mb-4">Fleet Status</h2>
        <div class="space-y-3">
          @for (v of vehicles(); track v.id) {
            <div class="flex items-center gap-4">
              <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <ng-icon name="lucideBus" size="14" class="text-blue-600" />
              </div>
              <div class="flex-1">
                <div class="text-sm font-medium">{{ v.vehicleNumber }}</div>
                <div class="text-xs text-muted-foreground">{{ v.type }} · {{ v.capacity }} seats</div>
              </div>
              <div class="text-xs font-medium px-2 py-0.5 rounded-full"
                   [class]="v.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'">
                {{ v.status }}
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class TransportDashboard implements OnInit {
  private readonly service = inject(TransportProviderDummyService);
  readonly vehicles = signal<any[]>([]);
  readonly bookings = signal<any[]>([]);
  ngOnInit(): void {
    this.service.getVehicles().subscribe(v => this.vehicles.set(v));
    this.service.getBookings().subscribe(b => this.bookings.set(b));
  }
}
