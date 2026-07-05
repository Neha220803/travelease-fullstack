import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { InvitationsDummyService } from '@app/core/services/invitations-dummy.service';
import { Invitation } from '@app/core/models/invitation.model';
import { StatusBadge } from '@app/shared/components/status-badge/status-badge';
import { EmptyState } from '@app/shared/components/empty-state/empty-state';

@Component({
  selector: 'app-invitations',
  imports: [DatePipe, NgIconComponent, HlmButtonImports, HlmSkeletonImports, StatusBadge, EmptyState],
  template: `
    <div class="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 class="text-2xl font-bold">Invitations</h1>
        <p class="text-muted-foreground text-sm mt-0.5">Trip invitations from other travelers</p>
      </div>

      @if (loading()) {
        <div class="space-y-3">
          @for (_ of [1,2]; track $index) {
            <div class="bg-card border border-border rounded-xl p-4">
              <hlm-skeleton class="h-5 w-3/4 rounded mb-2" />
              <hlm-skeleton class="h-4 w-1/2 rounded mb-4" />
              <div class="flex gap-2">
                <hlm-skeleton class="h-8 w-24 rounded-lg" />
                <hlm-skeleton class="h-8 w-24 rounded-lg" />
              </div>
            </div>
          }
        </div>
      } @else if (invitations().length === 0) {
        <app-empty-state icon="lucideMail" title="No invitations"
                         description="When someone invites you to their trip, it'll show up here." />
      } @else {
        <div class="space-y-4">
          @for (inv of invitations(); track inv.id) {
            <div class="bg-card border border-border rounded-xl p-5">
              <div class="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div class="font-semibold">{{ inv.tripName }}</div>
                  <div class="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <ng-icon name="lucideMapPin" size="12" />
                    {{ inv.tripDestination }}
                    <span class="mx-1">·</span>
                    <ng-icon name="lucideCalendar" size="12" />
                    {{ inv.tripStartDate | date:'MMM d, yyyy' }}
                  </div>
                  <div class="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                    <ng-icon name="lucideUser" size="12" />
                    Invited by {{ inv.inviterName }}
                  </div>
                </div>
                <app-status-badge [status]="inv.status" />
              </div>

              @if (inv.status === 'PENDING') {
                <div class="flex gap-2 mt-4 pt-3 border-t border-border">
                  <button hlmBtn size="sm" (click)="accept(inv.id)" [disabled]="processing() === inv.id">
                    <ng-icon name="lucideCheck" size="12" class="mr-1" />
                    Accept
                  </button>
                  <button hlmBtn variant="outline" size="sm" (click)="reject(inv.id)" [disabled]="processing() === inv.id">
                    <ng-icon name="lucideX" size="12" class="mr-1" />
                    Decline
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class Invitations implements OnInit {
  private readonly service = inject(InvitationsDummyService);

  readonly loading = signal(true);
  readonly invitations = signal<Invitation[]>([]);
  readonly processing = signal<string | null>(null);

  ngOnInit(): void {
    this.service.getMyInvitations().subscribe(invs => {
      this.invitations.set(invs);
      this.loading.set(false);
    });
  }

  accept(id: string): void {
    this.processing.set(id);
    this.service.acceptInvitation(id).subscribe(updated => {
      this.invitations.update(invs => invs.map(i => i.id === id ? updated : i));
      this.processing.set(null);
    });
  }

  reject(id: string): void {
    this.processing.set(id);
    this.service.rejectInvitation(id).subscribe(updated => {
      this.invitations.update(invs => invs.map(i => i.id === id ? updated : i));
      this.processing.set(null);
    });
  }
}
