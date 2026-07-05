import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { AdminDummyService, AdminStats, Partner } from '@app/core/services/admin-dummy.service';
import { StatCard } from '@app/shared/components/stat-card/stat-card';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, DecimalPipe, TitleCasePipe, NgIconComponent, HlmButtonImports, HlmBadgeImports, HlmSkeletonImports, StatCard],
  template: `
    <div class="space-y-8">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-bold">Admin Dashboard</h1>
          <p class="text-muted-foreground text-sm mt-0.5">Platform overview and key metrics</p>
        </div>
        <button hlmBtn variant="outline" size="sm">
          <ng-icon name="lucideDownload" size="14" class="mr-1.5" />
          Export Report
        </button>
      </div>

      <!-- KPI Cards -->
      @if (loading()) {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          @for (_ of [1,2,3,4]; track $index) {
            <div class="bg-card border border-border rounded-xl p-5">
              <hlm-skeleton class="h-4 w-24 rounded mb-3" />
              <hlm-skeleton class="h-8 w-32 rounded" />
            </div>
          }
        </div>
      } @else if (stats()) {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <app-stat-card label="Total Users" [value]="stats()!.totalUsers | number"
                         icon="lucideUsers" iconBg="oklch(0.93 0.05 185)" iconColor="var(--primary)"
                         [trend]="stats()!.recentGrowth.users" />
          <app-stat-card label="Total Trips" [value]="stats()!.totalTrips | number"
                         icon="lucideMapPin" iconBg="oklch(0.94 0.04 250)" iconColor="oklch(0.5 0.15 250)"
                         [trend]="stats()!.recentGrowth.trips" />
          <app-stat-card label="Revenue" [value]="'₹' + (stats()!.totalRevenue / 100000 | number:'1.1-1') + 'L'"
                         icon="lucideDollarSign" iconBg="oklch(0.95 0.04 145)" iconColor="oklch(0.5 0.15 145)"
                         [trend]="stats()!.recentGrowth.revenue" />
          <app-stat-card label="Pending Approvals" [value]="stats()!.pendingApprovals"
                         icon="lucideBadgeCheck" iconBg="oklch(0.95 0.04 75)" iconColor="oklch(0.6 0.15 75)" />
        </div>

        <!-- Booking breakdown -->
        <div class="grid lg:grid-cols-3 gap-4">
          <div class="bg-card border border-border rounded-xl p-5">
            <div class="text-xs text-muted-foreground uppercase font-medium mb-1">Hotel Bookings</div>
            <div class="text-2xl font-bold">{{ stats()!.hotelBookings | number }}</div>
            <div class="flex items-center gap-2 mt-3">
              <div class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div class="h-full bg-amber-500 rounded-full" style="width: 68%"></div>
              </div>
              <span class="text-xs text-muted-foreground">68% occupancy</span>
            </div>
          </div>
          <div class="bg-card border border-border rounded-xl p-5">
            <div class="text-xs text-muted-foreground uppercase font-medium mb-1">Transport Bookings</div>
            <div class="text-2xl font-bold">{{ stats()!.transportBookings | number }}</div>
            <div class="flex items-center gap-2 mt-3">
              <div class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div class="h-full bg-blue-500 rounded-full" style="width: 74%"></div>
              </div>
              <span class="text-xs text-muted-foreground">74% utilization</span>
            </div>
          </div>
          <div class="bg-card border border-border rounded-xl p-5">
            <div class="text-xs text-muted-foreground uppercase font-medium mb-1">Activity Bookings</div>
            <div class="text-2xl font-bold">{{ stats()!.activityBookings | number }}</div>
            <div class="flex items-center gap-2 mt-3">
              <div class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div class="h-full bg-green-500 rounded-full" style="width: 82%"></div>
              </div>
              <span class="text-xs text-muted-foreground">82% fill rate</span>
            </div>
          </div>
        </div>
      }

      <!-- Pending Approvals -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold">Pending Partner Approvals</h2>
          <a routerLink="/admin/approvals" class="text-sm text-primary hover:underline">View all</a>
        </div>
        <div class="space-y-3">
          @for (partner of pendingApprovals().slice(0, 3); track partner.id) {
            <div class="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <ng-icon name="lucideBriefcase" size="18" class="text-amber-600" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm">{{ partner.name }}</div>
                <div class="text-xs text-muted-foreground">{{ partner.type | titlecase }} · {{ partner.email }}</div>
              </div>
              <div class="flex gap-2">
                <button hlmBtn size="sm">Approve</button>
                <button hlmBtn size="sm" variant="outline">Reject</button>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Quick links -->
      <div>
        <h2 class="text-base font-semibold mb-4">Quick Links</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          @for (link of quickLinks; track link.path) {
            <a [routerLink]="link.path"
               class="bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-2 hover:border-primary/30 hover:shadow-sm transition-all group cursor-pointer">
              <ng-icon [name]="link.icon" size="24" class="text-muted-foreground group-hover:text-primary transition-colors" />
              <span class="text-xs text-center text-muted-foreground group-hover:text-foreground font-medium">{{ link.label }}</span>
            </a>
          }
        </div>
      </div>
    </div>
  `,
})
export class AdminDashboard implements OnInit {
  private readonly service = inject(AdminDummyService);

  readonly loading = signal(true);
  readonly stats = signal<AdminStats | null>(null);
  readonly pendingApprovals = signal<Partner[]>([]);

  readonly quickLinks = [
    { path: '/admin/users', label: 'Manage Users', icon: 'lucideUsers' },
    { path: '/admin/trips', label: 'All Trips', icon: 'lucideMapPin' },
    { path: '/admin/route-analytics', label: 'Route Analytics', icon: 'lucideRoute' },
    { path: '/admin/funnel', label: 'Funnel Report', icon: 'lucideGitFork' },
    { path: '/admin/hotels', label: 'Hotels', icon: 'lucideHotel' },
    { path: '/admin/buses', label: 'Transport', icon: 'lucideBus' },
    { path: '/admin/partners', label: 'Partners', icon: 'lucideBriefcase' },
    { path: '/admin/reports', label: 'Reports', icon: 'lucideBarChart2' },
  ];

  ngOnInit(): void {
    this.service.getStats().subscribe(stats => {
      this.stats.set(stats);
      this.loading.set(false);
    });
    this.service.getPendingApprovals().subscribe(a => this.pendingApprovals.set(a));
  }
}
