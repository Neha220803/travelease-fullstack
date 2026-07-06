import { Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { AdminDummyService } from '@app/core/services/admin-dummy.service';
import { Hotel } from '@app/core/models/hotel.model';
import { StatusBadge } from '@app/shared/components/status-badge/status-badge';

@Component({
  selector: 'app-admin-hotels',
  imports: [DecimalPipe, SlicePipe, NgIconComponent, HlmButtonImports, HlmSkeletonImports, StatusBadge],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Hotels</h1>
          <p class="text-muted-foreground text-sm mt-0.5">{{ hotels().length }} properties</p>
        </div>
        <button hlmBtn size="sm">
          <ng-icon name="lucidePlus" size="14" class="mr-1.5" />
          Add Hotel
        </button>
      </div>

      @if (loading()) {
        <div class="grid sm:grid-cols-2 gap-4">
          @for (_ of [1,2]; track $index) {
            <div class="bg-card border border-border rounded-xl p-4">
              <hlm-skeleton class="h-32 w-full rounded-lg mb-3" />
              <hlm-skeleton class="h-5 w-3/4 rounded mb-2" />
              <hlm-skeleton class="h-4 w-1/2 rounded" />
            </div>
          }
        </div>
      } @else {
        <div class="grid sm:grid-cols-2 gap-4">
          @for (hotel of hotels(); track hotel.id) {
            <div class="bg-card border border-border rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
              @if (hotel.imageUrl) {
                <img [src]="hotel.imageUrl" [alt]="hotel.name" class="w-full h-32 object-cover" />
              }
              <div class="p-4">
                <div class="font-semibold">{{ hotel.name }}</div>
                <div class="text-xs text-muted-foreground mt-0.5">{{ hotel.destinationName }} · {{ hotel.address | slice:0:40 }}...</div>
                <div class="flex items-center justify-between mt-3">
                  <div class="text-sm font-medium">₹{{ hotel.pricePerNight | number }}/night</div>
                  <div class="flex items-center gap-1 text-xs text-amber-600">
                    <ng-icon name="lucideStar" size="12" />
                    {{ hotel.rating }} ({{ hotel.reviewCount }} reviews)
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AdminHotels implements OnInit {
  private readonly service = inject(AdminDummyService);
  readonly loading = signal(true);
  readonly hotels = signal<Hotel[]>([]);
  ngOnInit(): void {
    this.service.getHotels().subscribe(h => { this.hotels.set(h); this.loading.set(false); });
  }
}
