import { Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { AdminDummyService } from '@app/core/services/admin-dummy.service';
import { TransportRoute } from '@app/core/models/transport.model';
import { MOCK_TRANSPORT_ROUTES } from '@app/core/data/mock-data';

@Component({
  selector: 'app-admin-route-analytics',
  imports: [DecimalPipe, NgIconComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold">Route Analytics</h1>
        <p class="text-muted-foreground text-sm mt-0.5">Popular travel routes on the platform</p>
      </div>

      <div class="grid gap-4">
        @for (route of routes; track route.id) {
          <div class="bg-card border border-border rounded-xl p-5">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ng-icon name="lucideRoute" size="18" class="text-primary" />
                </div>
                <div>
                  <div class="font-semibold">{{ route.sourceCity }} → {{ route.destinationCity }}</div>
                  <div class="text-xs text-muted-foreground">{{ route.distanceKm }} km</div>
                </div>
              </div>
              <div class="text-right">
                <div class="font-bold text-lg">{{ (route.distanceKm * 3) | number }}</div>
                <div class="text-xs text-muted-foreground">passengers/month</div>
              </div>
            </div>
            <div class="flex gap-2 flex-wrap">
              @for (mode of route.popularModes; track mode) {
                <span class="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{{ mode }}</span>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class AdminRouteAnalytics {
  readonly routes = MOCK_TRANSPORT_ROUTES;
}
