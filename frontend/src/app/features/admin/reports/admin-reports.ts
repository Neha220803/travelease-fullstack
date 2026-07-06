import { Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { AdminDummyService } from '@app/core/services/admin-dummy.service';
import { StatCard } from '@app/shared/components/stat-card/stat-card';

@Component({
  selector: 'app-admin-reports',
  imports: [DecimalPipe, NgIconComponent, HlmButtonImports, StatCard],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Reports</h1>
          <p class="text-muted-foreground text-sm">Platform performance overview</p>
        </div>
        <button hlmBtn variant="outline" size="sm">
          <ng-icon name="lucideDownload" size="14" class="mr-1.5" />Download CSV
        </button>
      </div>

      @if (stats()) {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <app-stat-card label="Total Revenue" [value]="'₹' + (stats()!.totalRevenue / 100000 | number:'1.1-1') + 'L'"
                         icon="lucideDollarSign" iconBg="oklch(0.95 0.04 145)" iconColor="oklch(0.5 0.15 145)"
                         [trend]="stats()!.recentGrowth.revenue" />
          <app-stat-card label="Hotel Bookings" [value]="stats()!.hotelBookings | number"
                         icon="lucideHotel" iconBg="oklch(0.95 0.04 75)" iconColor="oklch(0.6 0.15 75)" />
          <app-stat-card label="Transport Bookings" [value]="stats()!.transportBookings | number"
                         icon="lucideBus" iconBg="oklch(0.94 0.04 250)" iconColor="oklch(0.5 0.15 250)" />
          <app-stat-card label="Activity Bookings" [value]="stats()!.activityBookings | number"
                         icon="lucideActivity" iconBg="oklch(0.95 0.04 145)" iconColor="oklch(0.5 0.14 145)" />
        </div>
      }

      <!-- Monthly revenue chart visual (CSS bars) -->
      <div class="bg-card border border-border rounded-xl p-6">
        <h2 class="text-sm font-semibold mb-4">Monthly Revenue Trend</h2>
        <div class="flex items-end gap-3 h-32">
          @for (m of monthlyData; track m.month) {
            <div class="flex-1 flex flex-col items-center gap-1">
              <div class="w-full rounded-t-md bg-primary/80 transition-all hover:bg-primary"
                   [style.height.px]="(m.revenue / maxRevenue) * 110"></div>
              <div class="text-xs text-muted-foreground">{{ m.month }}</div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class AdminReports implements OnInit {
  private readonly service = inject(AdminDummyService);
  readonly stats = signal<any>(null);

  readonly monthlyData = [
    { month: 'Jan', revenue: 420000 },
    { month: 'Feb', revenue: 510000 },
    { month: 'Mar', revenue: 680000 },
    { month: 'Apr', revenue: 590000 },
    { month: 'May', revenue: 460000 },
    { month: 'Jun', revenue: 620000 },
    { month: 'Jul', revenue: 720000 },
  ];

  readonly maxRevenue = Math.max(...this.monthlyData.map(m => m.revenue));

  ngOnInit(): void { this.service.getStats().subscribe(s => this.stats.set(s)); }
}
