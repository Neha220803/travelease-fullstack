import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { AdminDummyService } from '@app/core/services/admin-dummy.service';
import { Trip } from '@app/core/models/trip.model';
import { StatusBadge } from '@app/shared/components/status-badge/status-badge';

@Component({
  selector: 'app-admin-trips',
  imports: [DatePipe, DecimalPipe, NgIconComponent, HlmButtonImports, HlmSkeletonImports, StatusBadge],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">All Trips</h1>
          <p class="text-muted-foreground text-sm mt-0.5">{{ trips().length }} trips on the platform</p>
        </div>
        <div class="relative">
          <ng-icon name="lucideSearch" size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search trips..."
                 class="h-9 pl-8 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-52"
                 (input)="search.set($any($event.target).value)" />
        </div>
      </div>

      @if (loading()) {
        <div class="space-y-2">
          @for (_ of [1,2,3]; track $index) {
            <div class="bg-card border border-border rounded-xl p-4">
              <hlm-skeleton class="h-5 w-3/4 rounded mb-2" />
              <hlm-skeleton class="h-4 w-1/2 rounded" />
            </div>
          }
        </div>
      } @else {
        <div class="bg-card border border-border rounded-xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-muted/50">
                <tr>
                  <th class="text-left p-4 font-medium text-muted-foreground">Trip</th>
                  <th class="text-left p-4 font-medium text-muted-foreground">Route</th>
                  <th class="text-left p-4 font-medium text-muted-foreground">Dates</th>
                  <th class="text-left p-4 font-medium text-muted-foreground">Members</th>
                  <th class="text-left p-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                @for (trip of filteredTrips(); track trip.id) {
                  <tr class="border-t border-border hover:bg-muted/30 transition-colors">
                    <td class="p-4">
                      <div class="font-medium">{{ trip.name }}</div>
                      <div class="text-xs text-muted-foreground">{{ trip.travelerCategory }}</div>
                    </td>
                    <td class="p-4 text-muted-foreground text-xs">{{ trip.source }} → {{ trip.destination }}</td>
                    <td class="p-4 text-muted-foreground text-xs">{{ trip.startDate | date:'MMM d' }} – {{ trip.endDate | date:'MMM d' }}</td>
                    <td class="p-4 text-muted-foreground">{{ trip.memberCount }}</td>
                    <td class="p-4"><app-status-badge [status]="trip.status" /></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminTrips implements OnInit {
  private readonly service = inject(AdminDummyService);
  readonly loading = signal(true);
  readonly trips = signal<Trip[]>([]);
  readonly search = signal('');
  readonly filteredTrips = () => {
    const q = this.search().toLowerCase();
    return q ? this.trips().filter(t => t.name.toLowerCase().includes(q) || t.destination.toLowerCase().includes(q)) : this.trips();
  };
  ngOnInit(): void {
    this.service.getAllTrips().subscribe(trips => { this.trips.set(trips); this.loading.set(false); });
  }
}
