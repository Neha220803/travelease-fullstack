import { Component, inject, OnInit, signal } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { AdminDummyService } from '@app/core/services/admin-dummy.service';
import { Transport } from '@app/core/models/transport.model';

@Component({
  selector: 'app-admin-buses',
  imports: [NgIconComponent, HlmButtonImports, HlmSkeletonImports],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Transport</h1>
          <p class="text-muted-foreground text-sm">{{ transports().length }} services on the platform</p>
        </div>
        <button hlmBtn size="sm"><ng-icon name="lucidePlus" size="14" class="mr-1.5" />Add Route</button>
      </div>

      @if (loading()) {
        <div class="space-y-3">@for (_ of [1,2,3]; track $index) { <div class="bg-card border border-border rounded-xl p-4"><hlm-skeleton class="h-5 w-3/4 rounded mb-2" /><hlm-skeleton class="h-4 w-1/2 rounded" /></div> } </div>
      } @else {
        <div class="space-y-3">
          @for (t of transports(); track t.id) {
            <div class="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <ng-icon [name]="typeIcon(t.type)" size="18" class="text-blue-600" />
              </div>
              <div class="flex-1">
                <div class="font-medium text-sm">{{ t.name }}</div>
                <div class="text-xs text-muted-foreground">{{ t.route }} · {{ t.type }}</div>
              </div>
              <div class="text-right">
                <div class="text-sm font-medium">{{ t.availableSeats }}/{{ t.totalSeats }}</div>
                <div class="text-xs text-muted-foreground">seats available</div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AdminBuses implements OnInit {
  private readonly service = inject(AdminDummyService);
  readonly loading = signal(true);
  readonly transports = signal<Transport[]>([]);
  ngOnInit(): void { this.service.getTransports().subscribe(t => { this.transports.set(t); this.loading.set(false); }); }
  typeIcon(type: string): string { return { BUS: 'lucideBus', TRAIN: 'lucideTruck', FLIGHT: 'lucidePlane' }[type as string] ?? 'lucideNavigation'; }
}
