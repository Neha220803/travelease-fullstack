import { Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { AdminDummyService, Partner } from '@app/core/services/admin-dummy.service';
import { StatusBadge } from '@app/shared/components/status-badge/status-badge';

@Component({
  selector: 'app-admin-partners',
  imports: [DecimalPipe, TitleCasePipe, NgIconComponent, HlmButtonImports, HlmSkeletonImports, StatusBadge],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold">Partners</h1>
        <p class="text-muted-foreground text-sm mt-0.5">Manage hotel, transport and activity providers</p>
      </div>

      @if (loading()) {
        <div class="space-y-3">
          @for (_ of [1,2,3]; track $index) {
            <div class="bg-card border border-border rounded-xl p-4">
              <hlm-skeleton class="h-5 w-1/2 rounded mb-2" />
              <hlm-skeleton class="h-4 w-1/3 rounded" />
            </div>
          }
        </div>
      } @else {
        <div class="space-y-3">
          @for (partner of partners(); track partner.id) {
            <div class="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   [class]="partnerBg(partner.type)">
                <ng-icon [name]="partnerIcon(partner.type)" size="18" class="text-white" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm">{{ partner.name }}</div>
                <div class="text-xs text-muted-foreground">{{ partner.type | titlecase }} · {{ partner.email }}</div>
                <div class="text-xs text-muted-foreground">{{ partner.phone }}</div>
              </div>
              <app-status-badge [status]="partner.status" />
              @if (partner.status === 'PENDING') {
                <div class="flex gap-2">
                  <button hlmBtn size="sm" (click)="approve(partner.id)">Approve</button>
                  <button hlmBtn size="sm" variant="outline">Reject</button>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AdminPartners implements OnInit {
  private readonly service = inject(AdminDummyService);
  readonly loading = signal(true);
  readonly partners = signal<Partner[]>([]);

  ngOnInit(): void {
    this.service.getPartners().subscribe(p => { this.partners.set(p); this.loading.set(false); });
  }

  approve(id: string): void {
    this.service.approvePartner(id).subscribe(updated => {
      this.partners.update(ps => ps.map(p => p.id === id ? updated : p));
    });
  }

  partnerBg(type: string): string {
    const m: Record<string, string> = {
      HOTEL_PROVIDER: 'bg-amber-500',
      TRANSPORT_PROVIDER: 'bg-blue-500',
      ACTIVITY_PROVIDER: 'bg-green-500',
    };
    return m[type] ?? 'bg-muted';
  }

  partnerIcon(type: string): string {
    const m: Record<string, string> = {
      HOTEL_PROVIDER: 'lucideHotel',
      TRANSPORT_PROVIDER: 'lucideBus',
      ACTIVITY_PROVIDER: 'lucideActivity',
    };
    return m[type] ?? 'lucideBriefcase';
  }
}
