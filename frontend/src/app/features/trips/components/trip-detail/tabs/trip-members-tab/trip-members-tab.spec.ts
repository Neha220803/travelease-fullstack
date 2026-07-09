import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideUserPlus } from '@ng-icons/lucide';
import { Subject, of, throwError } from 'rxjs';
import { TripMembersTab } from '@app/features/trips/components/trip-detail/tabs/trip-members-tab/trip-members-tab';
import { TripsService } from '@app/features/trips/services/trips.service';
import { TripMember } from '@app/features/trips/services/trip.models';
import { UsersService } from '@app/core/users/users.service';
import { TravelerSearchResult } from '@app/core/users/user-search.model';

const TRIP_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

const SAMPLE_MEMBERS: TripMember[] = [
  {
    tripMemberId: 'cccccccc-0000-0000-0000-000000000003',
    userId: 'u2',
    name: 'Bob Traveler',
    email: 'bob@travelease.test',
    memberStatus: 'ACCEPTED',
    joinedDate: '2026-07-01T00:00:00Z',
    budgetAmount: 5000,
    spentAmount: 0,
  },
];

const CARA: TravelerSearchResult = { id: 'u3', name: 'Cara Traveler', email: 'cara@travelease.test' };

async function setup(tripsService: Partial<TripsService>) {
  await TestBed.configureTestingModule({
    imports: [TripMembersTab],
    providers: [
      provideIcons({ lucideUserPlus }),
      { provide: ActivatedRoute, useValue: { paramMap: of(new Map([['tripId', TRIP_ID]])) } },
      { provide: TripsService, useValue: tripsService },
      { provide: UsersService, useValue: { searchTravelers: () => of([]) } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(TripMembersTab);
  fixture.detectChanges();
  return fixture;
}

function instance(fixture: ReturnType<typeof TestBed.createComponent<TripMembersTab>>) {
  return fixture.componentInstance as unknown as {
    onPick: (t: TravelerSearchResult) => void;
    onDialogStateChanged: (state: 'open' | 'closed') => void;
    excludeIds: () => string[];
    invitedThisSession: { set: (v: TravelerSearchResult[]) => void } & (() => TravelerSearchResult[]);
    inviteError: { set: (v: string | null) => void } & (() => string | null);
  };
}

describe('TripMembersTab', () => {
  it('shows a loading message before members arrive', async () => {
    const subject = new Subject<TripMember[]>();
    const fixture = await setup({ getTripMembers: () => subject.asObservable() });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Loading members');
  });

  it('renders every member with real fields', async () => {
    const fixture = await setup({ getTripMembers: () => of(SAMPLE_MEMBERS) });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Bob Traveler');
    expect(el.textContent).toContain('bob@travelease.test');
  });

  it('shows an error message when loading members fails', async () => {
    const fixture = await setup({ getTripMembers: () => throwError(() => new Error('boom')) });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Something went wrong');
  });

  it('calls getTripMembers with the tripId from the route', async () => {
    const getTripMembers = vi.fn().mockReturnValue(of(SAMPLE_MEMBERS));
    await setup({ getTripMembers });
    expect(getTripMembers).toHaveBeenCalledWith(TRIP_ID);
  });

  it('invites a picked traveler, appends it to the list and the chip trail', async () => {
    const newMember: TripMember = {
      tripMemberId: 'eeeeeeee-0000-0000-0000-000000000005',
      userId: 'u3',
      name: 'Cara Traveler',
      email: 'cara@travelease.test',
      memberStatus: 'INVITED',
      joinedDate: '2026-07-02T00:00:00Z',
      budgetAmount: 0,
      spentAmount: 0,
    };
    const inviteMember = vi.fn().mockReturnValue(of(newMember));
    const fixture = await setup({ getTripMembers: () => of(SAMPLE_MEMBERS), inviteMember });

    instance(fixture).onPick(CARA);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(inviteMember).toHaveBeenCalledWith(TRIP_ID, 'cara@travelease.test');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Cara Traveler');
  });

  it('shows an inline error and leaves the chip trail unchanged when an invite fails', async () => {
    const inviteMember = vi.fn().mockReturnValue(throwError(() => new Error('boom')));
    const fixture = await setup({ getTripMembers: () => of(SAMPLE_MEMBERS), inviteMember });

    // The dialog's content (including this error paragraph) renders via a CDK
    // Overlay portal that only materializes once the dialog is actually opened,
    // so it never appears in fixture.nativeElement here (same constraint noted
    // on the "invites a picked traveler" test below) — asserting on the signal
    // directly instead of DOM text.
    instance(fixture).onPick(CARA);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(instance(fixture).inviteError()).toBe('Could not send the invite. They may already be invited.');
    expect(instance(fixture).invitedThisSession()).toEqual([]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Cara Traveler');
  });

  it('excludes existing members and this-session invites from the picker', async () => {
    const newMember: TripMember = {
      tripMemberId: 'eeeeeeee-0000-0000-0000-000000000005',
      userId: 'u3',
      name: 'Cara Traveler',
      email: 'cara@travelease.test',
      memberStatus: 'INVITED',
      joinedDate: '2026-07-02T00:00:00Z',
      budgetAmount: 0,
      spentAmount: 0,
    };
    const inviteMember = vi.fn().mockReturnValue(of(newMember));
    const fixture = await setup({ getTripMembers: () => of(SAMPLE_MEMBERS), inviteMember });

    expect(instance(fixture).excludeIds()).toEqual(['u2']);

    instance(fixture).onPick(CARA);
    await fixture.whenStable();

    expect(instance(fixture).excludeIds()).toEqual(['u2', 'u3']);
  });

  it('resets the chip trail and error when the dialog reopens', async () => {
    const fixture = await setup({ getTripMembers: () => of(SAMPLE_MEMBERS) });
    const comp = instance(fixture);
    comp.invitedThisSession.set([CARA]);
    comp.inviteError.set('boom');

    comp.onDialogStateChanged('open');

    expect(comp.invitedThisSession()).toEqual([]);
    expect(comp.inviteError()).toBeNull();
  });

  it('removes a member from the list on success', async () => {
    const removeMember = vi.fn().mockReturnValue(of(undefined));
    const fixture = await setup({ getTripMembers: () => of(SAMPLE_MEMBERS), removeMember });
    const el = fixture.nativeElement as HTMLElement;

    const removeBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Remove',
    )!;
    removeBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(removeMember).toHaveBeenCalledWith(TRIP_ID, SAMPLE_MEMBERS[0].tripMemberId);
    expect(el.textContent).not.toContain('Bob Traveler');
  });
});
