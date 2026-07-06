import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { TripsDummyService } from '@app/core/services/trips-dummy.service';
import { Trip, TripStatus, TravelerCategory } from '@app/core/models/trip.model';
import { StatusBadge } from '@app/shared/components/status-badge/status-badge';
import { EmptyState } from '@app/shared/components/empty-state/empty-state';
import { BrnSelectImports } from '@spartan-ng/brain/select';

type TabFilter = 'ALL' | TripStatus;

@Component({
  selector: 'app-trips-list',
  imports: [RouterLink, DatePipe, ReactiveFormsModule, NgIconComponent, HlmButtonImports, HlmInputImports,
            HlmSkeletonImports, HlmBadgeImports, HlmDialogImports, HlmSelectImports, BrnSelectImports,
            StatusBadge, EmptyState],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-bold">My Trips</h1>
          <p class="text-muted-foreground text-sm mt-0.5">{{ totalCount() }} trips planned</p>
        </div>
        <button hlmBtn (click)="showCreateDialog.set(true)">
          <ng-icon name="lucidePlus" size="14" class="mr-1.5" />
          New Trip
        </button>
      </div>

      <!-- Status tabs -->
      <div class="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        @for (tab of tabs; track tab.value) {
          <button class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  [class]="activeTab() === tab.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                  (click)="activeTab.set(tab.value)">
            {{ tab.label }}
            @if (tab.count > 0) {
              <span class="ml-1.5 text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5">{{ tab.count }}</span>
            }
          </button>
        }
      </div>

      <!-- Trips grid -->
      @if (loading()) {
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (_ of [1,2,3]; track $index) {
            <div class="bg-card border border-border rounded-xl overflow-hidden">
              <hlm-skeleton class="h-36 w-full" />
              <div class="p-4 space-y-2">
                <hlm-skeleton class="h-5 w-3/4 rounded" />
                <hlm-skeleton class="h-4 w-1/2 rounded" />
              </div>
            </div>
          }
        </div>
      } @else if (filteredTrips().length === 0) {
        <app-empty-state icon="lucideMapPin" title="No trips found"
                         [description]="activeTab() === 'ALL' ? 'Start planning your first adventure!' : 'No trips with this status.'"
                         [actionLabel]="activeTab() === 'ALL' ? 'Create Trip' : ''"
                         actionIcon="lucidePlus"
                         (action)="showCreateDialog.set(true)" />
      } @else {
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (trip of filteredTrips(); track trip.id) {
            <a [routerLink]="['/trips', trip.id]"
               class="block bg-card border border-border rounded-xl overflow-hidden hover:shadow-md hover:border-primary/30 transition-all group">
              <!-- Cover -->
              <div class="h-36 relative overflow-hidden">
                @if (trip.coverImage) {
                  <img [src]="trip.coverImage" [alt]="trip.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                } @else {
                  <div class="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <ng-icon name="lucideMapPin" size="32" class="text-primary/40" />
                  </div>
                }
                <div class="absolute top-3 right-3">
                  <app-status-badge [status]="trip.status" />
                </div>
              </div>

              <div class="p-4">
                <div class="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">{{ trip.name }}</div>
                <div class="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <ng-icon name="lucideMapPin" size="10" />
                  {{ trip.source }} → {{ trip.destination }}
                </div>
                <div class="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <ng-icon name="lucideCalendar" size="10" />
                  {{ trip.startDate | date:'MMM d' }} – {{ trip.endDate | date:'MMM d, yyyy' }}
                </div>
                <div class="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <div class="text-xs text-muted-foreground flex items-center gap-1">
                    <ng-icon name="lucideUsers" size="10" />
                    {{ trip.memberCount }} {{ trip.memberCount === 1 ? 'member' : 'members' }}
                  </div>
                  <span class="text-xs bg-accent text-accent-foreground rounded-full px-2 py-0.5">{{ trip.travelerCategory }}</span>
                </div>
              </div>
            </a>
          }
        </div>
      }

      <!-- Create Trip Dialog -->
      @if (showCreateDialog()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" (click)="showCreateDialog.set(false)"></div>
          <div class="relative bg-background border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h2 class="text-xl font-bold mb-1">Create New Trip</h2>
            <p class="text-sm text-muted-foreground mb-5">Plan your next adventure</p>

            <form [formGroup]="createForm" (ngSubmit)="createTrip()" class="space-y-4">
              <div class="space-y-1.5">
                <label class="text-sm font-medium">Trip Name</label>
                <input hlmInput type="text" formControlName="name" placeholder="Goa Beach Escape" class="w-full" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <label class="text-sm font-medium">From</label>
                  <input hlmInput type="text" formControlName="source" placeholder="Mumbai" class="w-full" />
                </div>
                <div class="space-y-1.5">
                  <label class="text-sm font-medium">To</label>
                  <input hlmInput type="text" formControlName="destination" placeholder="Goa" class="w-full" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <label class="text-sm font-medium">Start Date</label>
                  <input hlmInput type="date" formControlName="startDate" class="w-full" />
                </div>
                <div class="space-y-1.5">
                  <label class="text-sm font-medium">End Date</label>
                  <input hlmInput type="date" formControlName="endDate" class="w-full" />
                </div>
              </div>
              <div class="space-y-1.5">
                <label class="text-sm font-medium">Traveler Type</label>
                <select formControlName="travelerCategory"
                        class="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="SOLO">Solo</option>
                  <option value="COUPLE">Couple</option>
                  <option value="FAMILY">Family</option>
                  <option value="FRIENDS">Friends</option>
                  <option value="CORPORATE">Corporate</option>
                </select>
              </div>

              <div class="flex gap-3 pt-2">
                <button hlmBtn type="button" variant="outline" class="flex-1" (click)="showCreateDialog.set(false)">Cancel</button>
                <button hlmBtn type="submit" class="flex-1" [disabled]="createForm.invalid || creating()">
                  @if (creating()) {
                    <ng-icon name="lucideRefreshCw" size="12" class="animate-spin mr-1.5" />
                  }
                  Create Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class TripsList implements OnInit {
  private readonly tripsService = inject(TripsDummyService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly trips = signal<Trip[]>([]);
  readonly activeTab = signal<TabFilter>('ALL');
  readonly showCreateDialog = signal(false);
  readonly creating = signal(false);
  readonly totalCount = () => this.trips().length;

  readonly tabs = [
    { label: 'All', value: 'ALL' as TabFilter, count: 0 },
    { label: 'Upcoming', value: 'UPCOMING' as TabFilter, count: 0 },
    { label: 'Active', value: 'ACTIVE' as TabFilter, count: 0 },
    { label: 'Completed', value: 'COMPLETED' as TabFilter, count: 0 },
  ];

  readonly filteredTrips = () => {
    const tab = this.activeTab();
    return tab === 'ALL' ? this.trips() : this.trips().filter(t => t.status === tab);
  };

  readonly createForm = this.fb.group({
    name: ['', Validators.required],
    source: ['', Validators.required],
    destination: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    travelerCategory: ['FRIENDS' as TravelerCategory],
  });

  ngOnInit(): void {
    this.tripsService.getMyTrips().subscribe(trips => {
      this.trips.set(trips);
      this.loading.set(false);
      // Update tab counts
      this.tabs[1].count = trips.filter(t => t.status === 'UPCOMING').length;
      this.tabs[2].count = trips.filter(t => t.status === 'ACTIVE').length;
      this.tabs[3].count = trips.filter(t => t.status === 'COMPLETED').length;
    });
  }

  createTrip(): void {
    if (this.createForm.invalid) return;
    this.creating.set(true);
    const value = this.createForm.value;
    this.tripsService.createTrip(value as Partial<Trip>).subscribe(trip => {
      this.trips.update(ts => [trip, ...ts]);
      this.showCreateDialog.set(false);
      this.creating.set(false);
      this.createForm.reset({ travelerCategory: 'FRIENDS' });
    });
  }
}
