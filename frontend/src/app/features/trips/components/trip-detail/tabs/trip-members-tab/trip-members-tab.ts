import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { TripsService } from '@app/features/trips/services/trips.service';
import { TripMember } from '@app/features/trips/services/trip.models';
import { TravelerPicker } from '@app/features/trips/components/traveler-picker/traveler-picker';
import { TravelerSearchResult } from '@app/core/users/user-search.model';

@Component({
  selector: 'app-trip-members-tab',
  imports: [
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmAvatarImports,
    HlmBadgeImports,
    HlmDialogImports,
    HlmLabelImports,
    StatusBadge,
    TravelerPicker,
  ],
  templateUrl: './trip-members-tab.html',
})
export class TripMembersTab {
  private readonly route = inject(ActivatedRoute);
  private readonly tripsService = inject(TripsService);

  private readonly tripId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('tripId') ?? '')),
    { initialValue: '' },
  );

  protected readonly members = signal<TripMember[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly inviteError = signal<string | null>(null);
  protected readonly invitedThisSession = signal<TravelerSearchResult[]>([]);

  // members() already reflects a successful pick immediately (onPick appends to it),
  // so invitedThisSession — a display-only chip trail — would double-count here.
  protected readonly excludeIds = computed(() => this.members().map((m) => m.userId));

  constructor() {
    this.tripsService.getTripMembers(this.tripId()).subscribe({
      next: (members) => {
        this.members.set(members);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Something went wrong loading trip members. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected onDialogStateChanged(state: 'open' | 'closed'): void {
    if (state === 'open') {
      this.invitedThisSession.set([]);
      this.inviteError.set(null);
    }
  }

  protected onPick(traveler: TravelerSearchResult): void {
    this.inviteError.set(null);
    this.tripsService.inviteMember(this.tripId(), traveler.email).subscribe({
      next: (member) => {
        this.members.update((list) => [...list, member]);
        this.invitedThisSession.update((list) => [...list, traveler]);
      },
      error: () => {
        this.inviteError.set('Could not send the invite. They may already be invited.');
      },
    });
  }

  protected onRemove(member: TripMember): void {
    this.tripsService.removeMember(this.tripId(), member.tripMemberId).subscribe({
      next: () => {
        this.members.update((list) => list.filter((m) => m.tripMemberId !== member.tripMemberId));
      },
      error: () => this.error.set('Could not remove this member. Please try again.'),
    });
  }

  protected initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
