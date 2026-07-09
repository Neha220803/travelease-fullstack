# Add Members During Trip Creation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a trip is created, prompt the organizer to add members now (via a search-and-pick UI) or later, and let them invite several people in one sitting before landing on the trip detail page.

**Architecture:** Extract the existing typeahead search logic (currently inline in `TripMembersTab`) into a shared `TravelerPicker` component. Both `TripMembersTab`'s dialog and a new post-creation dialog in `NewTrip` use it, inviting immediately on each pick and showing a running "invited" chip list. `TripDetail` gains a `?tab=` query param so the post-creation dialog can land the organizer directly on the Members tab.

**Tech Stack:** Angular 21 (standalone components, signals, `input()`/`output()`), RxJS, `@spartan-ng/helm` (autocomplete, dialog, badge), Vitest.

## Global Constraints

- No batch/bulk invite endpoint — every invite is one `POST /api/trips/{tripId}/members` call, same as today.
- No changes to `TripTravelTab` or `TripAccommodationTab` — out of scope (separate specs).
- No "remove/undo" action inside either dialog — removing an invited member happens via the Members tab's existing "Remove" button, after the fact.
- Every dialog close path (explicit button, backdrop click, Escape, the built-in X) must result in the same navigation decision — no per-button-special-casing.
- Follow existing codebase conventions: standalone components, `input()`/`output()` (not decorators), signals over RxJS state, protected members tested via direct method calls (not overlay DOM queries — CDK dialog/autocomplete content renders into a `document.body`-attached overlay that this codebase's specs don't query into; see the existing comment in `trip-members-tab.spec.ts`).

---

## Task 1: Extract `TravelerPicker` shared component

**Files:**
- Create: `frontend/src/app/features/trips/components/traveler-picker/traveler-picker.ts`
- Create: `frontend/src/app/features/trips/components/traveler-picker/traveler-picker.html`
- Create: `frontend/src/app/features/trips/components/traveler-picker/traveler-picker.spec.ts`

**Interfaces:**
- Produces: `TravelerPicker` (selector `app-traveler-picker`), standalone component.
  - Input: `inputId = input.required<string>()` — forwarded to the native search `<input>`'s `id`, for label association.
  - Input: `excludeIds = input<string[]>([])` — traveler ids to hide from results.
  - Output: `selected = output<TravelerSearchResult>()` — fires once per pick; the component clears its own search text/value/results immediately after emitting, ready for the next search.
  - Depends on: `UsersService.searchTravelers(query: string): Observable<TravelerSearchResult[]>` (`@app/core/users/users.service`, already exists), `TravelerSearchResult` (`@app/core/users/user-search.model`, already exists: `{ id: string; name: string; email: string }`).

- [ ] **Step 1: Write the component**

`frontend/src/app/features/trips/components/traveler-picker/traveler-picker.ts`:

```ts
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { HlmAutocompleteImports } from '@spartan-ng/helm/autocomplete';
import { UsersService } from '@app/core/users/users.service';
import { TravelerSearchResult } from '@app/core/users/user-search.model';

const MIN_QUERY_LENGTH = 2;

@Component({
  selector: 'app-traveler-picker',
  imports: [HlmAutocompleteImports],
  templateUrl: './traveler-picker.html',
})
export class TravelerPicker {
  private readonly usersService = inject(UsersService);

  public readonly inputId = input.required<string>();
  public readonly excludeIds = input<string[]>([]);
  public readonly selected = output<TravelerSearchResult>();

  protected readonly query = signal('');
  protected readonly searching = signal(false);
  protected readonly rawResults = signal<TravelerSearchResult[]>([]);
  protected readonly pickedValue = signal<TravelerSearchResult | null>(null);

  protected readonly results = computed(() =>
    this.rawResults().filter((r) => !this.excludeIds().includes(r.id)),
  );

  protected readonly itemToString = (traveler: TravelerSearchResult): string =>
    `${traveler.name} (${traveler.email})`;

  protected readonly isSameTraveler = (
    item: TravelerSearchResult,
    selected: TravelerSearchResult | null | undefined,
  ): boolean => item.id === selected?.id;

  constructor() {
    toObservable(this.query)
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          const trimmed = query.trim();
          if (trimmed.length < MIN_QUERY_LENGTH) {
            this.searching.set(false);
            return of<TravelerSearchResult[]>([]);
          }
          this.searching.set(true);
          return this.usersService
            .searchTravelers(trimmed)
            .pipe(catchError(() => of<TravelerSearchResult[]>([])));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.searching.set(false);
        this.rawResults.set(results);
      });
  }

  protected onValueChange(value: TravelerSearchResult | null | undefined): void {
    if (!value) {
      return;
    }
    this.selected.emit(value);
    this.pickedValue.set(null);
    this.query.set('');
    this.rawResults.set([]);
  }
}
```

`frontend/src/app/features/trips/components/traveler-picker/traveler-picker.html`:

```html
<hlm-autocomplete
  [value]="pickedValue()"
  (valueChange)="onValueChange($event)"
  [search]="query()"
  (searchChange)="query.set($event)"
  [itemToString]="itemToString"
  [isItemEqualToValue]="isSameTraveler"
>
  <hlm-autocomplete-input [inputId]="inputId()" placeholder="Search by name or email" />
  <ng-template hlmAutocompletePortal>
    <hlm-autocomplete-content>
      <div hlmAutocompleteList>
        @if (searching()) {
          <hlm-autocomplete-status>Searching…</hlm-autocomplete-status>
        } @else {
          @for (r of results(); track r.id) {
            <hlm-autocomplete-item [value]="r">{{ r.name }} ({{ r.email }})</hlm-autocomplete-item>
          }
          <hlm-autocomplete-empty>No matching travelers</hlm-autocomplete-empty>
        }
      </div>
    </hlm-autocomplete-content>
  </ng-template>
</hlm-autocomplete>
```

- [ ] **Step 2: Write the failing tests**

`frontend/src/app/features/trips/components/traveler-picker/traveler-picker.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TravelerPicker } from '@app/features/trips/components/traveler-picker/traveler-picker';
import { UsersService } from '@app/core/users/users.service';
import { TravelerSearchResult } from '@app/core/users/user-search.model';

const CARA: TravelerSearchResult = { id: 'u3', name: 'Cara Traveler', email: 'cara@travelease.test' };
const BOB: TravelerSearchResult = { id: 'u2', name: 'Bob Traveler', email: 'bob@travelease.test' };

async function setup(searchTravelers: (query: string) => ReturnType<UsersService['searchTravelers']>) {
  await TestBed.configureTestingModule({
    imports: [TravelerPicker],
    providers: [{ provide: UsersService, useValue: { searchTravelers } }],
  }).compileComponents();
  const fixture = TestBed.createComponent(TravelerPicker);
  fixture.componentRef.setInput('inputId', 'test-picker');
  fixture.detectChanges();
  return fixture;
}

function instance(fixture: ReturnType<typeof TestBed.createComponent<TravelerPicker>>) {
  return fixture.componentInstance as unknown as {
    query: { set: (v: string) => void };
    results: () => TravelerSearchResult[];
    searching: () => boolean;
    onValueChange: (v: TravelerSearchResult | null | undefined) => void;
  };
}

describe('TravelerPicker', () => {
  it('does not search below the minimum query length', async () => {
    const searchTravelers = vi.fn().mockReturnValue(of([CARA]));
    const fixture = await setup(searchTravelers);
    instance(fixture).query.set('c');
    await new Promise((r) => setTimeout(r, 350));

    expect(searchTravelers).not.toHaveBeenCalled();
  });

  it('debounces and calls the service once the query is long enough', async () => {
    const searchTravelers = vi.fn().mockReturnValue(of([CARA]));
    const fixture = await setup(searchTravelers);
    instance(fixture).query.set('cara');
    await new Promise((r) => setTimeout(r, 350));
    fixture.detectChanges();

    expect(searchTravelers).toHaveBeenCalledWith('cara');
    expect(instance(fixture).results()).toEqual([CARA]);
  });

  it('filters out excluded ids from the results', async () => {
    const searchTravelers = vi.fn().mockReturnValue(of([CARA, BOB]));
    const fixture = await setup(searchTravelers);
    fixture.componentRef.setInput('excludeIds', ['u2']);
    instance(fixture).query.set('trav');
    await new Promise((r) => setTimeout(r, 350));
    fixture.detectChanges();

    expect(instance(fixture).results()).toEqual([CARA]);
  });

  it('emits selected on pick and clears its own state', async () => {
    const searchTravelers = vi.fn().mockReturnValue(of([CARA]));
    const fixture = await setup(searchTravelers);
    const emitted: TravelerSearchResult[] = [];
    fixture.componentInstance.selected.subscribe((t) => emitted.push(t));

    instance(fixture).query.set('cara');
    await new Promise((r) => setTimeout(r, 350));
    fixture.detectChanges();
    instance(fixture).onValueChange(CARA);

    expect(emitted).toEqual([CARA]);
    expect(instance(fixture).results()).toEqual([]);
  });

  it('ignores a null/undefined value change (no-op close)', async () => {
    const searchTravelers = vi.fn().mockReturnValue(of([]));
    const fixture = await setup(searchTravelers);
    const emitted: TravelerSearchResult[] = [];
    fixture.componentInstance.selected.subscribe((t) => emitted.push(t));

    instance(fixture).onValueChange(null);

    expect(emitted).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the tests to verify they pass**

Run: `npx ng test --watch=false --include="**/traveler-picker.spec.ts"`
Expected: all 5 tests PASS. (Written test-first per the checklist above, but since the implementation in Step 1 already exists, this run is the first real signal — if anything fails, fix `traveler-picker.ts`/`.html`, not the test.)

- [ ] **Step 4: Full build check**

Run: `npx ng build`
Expected: builds clean, no new template/type errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/trips/components/traveler-picker/
git commit -m "feat: extract TravelerPicker shared typeahead component"
```

---

## Task 2: Rework `TripMembersTab` to invite-on-pick with a chip trail

**Files:**
- Modify: `frontend/src/app/features/trips/components/trip-detail/tabs/trip-members-tab/trip-members-tab.ts`
- Modify: `frontend/src/app/features/trips/components/trip-detail/tabs/trip-members-tab/trip-members-tab.html`
- Modify: `frontend/src/app/features/trips/components/trip-detail/tabs/trip-members-tab/trip-members-tab.spec.ts`

**Interfaces:**
- Consumes: `TravelerPicker` (Task 1) — `[inputId]`, `[excludeIds]`, `(selected)`.
- Consumes: `TripsService.inviteMember(tripId: string, email: string): Observable<TripMember>` (existing), `TripsService.getTripMembers`/`removeMember` (existing, unchanged).
- Produces: no new public surface — `TripMembersTab` is only used by `TripDetail`, which passes no inputs to it today and won't need to.

- [ ] **Step 1: Update the component**

Replace the full contents of `trip-members-tab.ts`:

```ts
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

  protected readonly excludeIds = computed(() => [
    ...this.members().map((m) => m.userId),
    ...this.invitedThisSession().map((t) => t.id),
  ]);

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
```

Note: `inviting` (the old single-in-flight-request boolean) is dropped — with the picker clearing itself after every pick, there's no submit button whose `[disabled]` needs it, and multiple quick picks are expected to fire independent concurrent invite requests.

- [ ] **Step 2: Update the template**

Replace the dialog block (lines 4–52) in `trip-members-tab.html`, keeping the `hlmCardContent` member table below it unchanged:

```html
<div hlmCard>
  <div hlmCardHeader class="flex flex-row items-center justify-between">
    <h3 hlmCardTitle>Trip Members</h3>
    <hlm-dialog (stateChanged)="onDialogStateChanged($event)">
      <button hlmDialogTrigger hlmBtn size="sm">
        <ng-icon name="lucideUserPlus" class="h-4 w-4 mr-1" /> Invite Member
      </button>
      <ng-template hlmDialogPortal>
        <hlm-dialog-content>
          <div hlmDialogHeader>
            <h3 hlmDialogTitle>Invite a member</h3>
          </div>
          <div class="space-y-3">
            <div class="space-y-2">
              <label hlmLabel for="invite-member-search">Traveler</label>
              <app-traveler-picker
                inputId="invite-member-search"
                [excludeIds]="excludeIds()"
                (selected)="onPick($event)"
              />
            </div>
            @if (invitedThisSession().length > 0) {
              <div class="flex flex-wrap gap-2">
                @for (t of invitedThisSession(); track t.id) {
                  <span hlmBadge variant="outline">{{ t.name }}</span>
                }
              </div>
            }
            @if (inviteError()) {
              <p class="text-xs text-destructive">{{ inviteError() }}</p>
            }
            <div hlmDialogFooter>
              <button hlmBtn hlmDialogClose>Done</button>
            </div>
          </div>
        </hlm-dialog-content>
      </ng-template>
    </hlm-dialog>
  </div>
  <div hlmCardContent>
    @if (loading()) {
      <p class="text-sm text-muted-foreground">Loading members…</p>
    } @else if (error()) {
      <p class="text-sm text-destructive">{{ error() }}</p>
    } @else {
      <div class="rounded-md border">
        <div class="grid grid-cols-12 px-4 py-2.5 text-xs font-medium text-muted-foreground bg-muted/40 border-b">
          <div class="col-span-6">Name</div>
          <div class="col-span-4">Status</div>
          <div class="col-span-2 text-right">Action</div>
        </div>
        @for (m of members(); track m.tripMemberId) {
          <div class="grid grid-cols-12 px-4 py-3 items-center border-b last:border-0 text-sm">
            <div class="col-span-6 flex items-center gap-3">
              <hlm-avatar class="h-8 w-8">
                <span hlmAvatarFallback class="bg-primary/10 text-primary text-xs">{{ initials(m.name) }}</span>
              </hlm-avatar>
              <div>
                <p class="font-medium">{{ m.name }}</p>
                <p class="text-xs text-muted-foreground">{{ m.email }}</p>
              </div>
            </div>
            <div class="col-span-4"><app-status-badge [status]="m.memberStatus" /></div>
            <div class="col-span-2 text-right">
              <button hlmBtn variant="ghost" size="sm" (click)="onRemove(m)">Remove</button>
            </div>
          </div>
        }
      </div>
    }
  </div>
</div>
```

- [ ] **Step 3: Update the spec**

In `trip-members-tab.spec.ts`, replace the `import` line for `TripMember` and the "invites a member by email" test. Full updated file:

```ts
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
    invitedThisSession: { set: (v: TravelerSearchResult[]) => void };
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

    instance(fixture).onPick(CARA);
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Could not send the invite');
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

    expect(comp.excludeIds()).toEqual(['u2']);
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
```

- [ ] **Step 4: Run the tests**

Run: `npx ng test --watch=false --include="**/trip-members-tab.spec.ts"`
Expected: all 9 tests PASS.

- [ ] **Step 5: Full build check**

Run: `npx ng build`
Expected: builds clean.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/trips/components/trip-detail/tabs/trip-members-tab/
git commit -m "feat: invite-on-pick with a chip trail in the Members tab dialog"
```

---

## Task 3: `TripDetail` seeds its active tab from a `?tab=` query param

**Files:**
- Modify: `frontend/src/app/features/trips/components/trip-detail/trip-detail.ts`
- Modify: `frontend/src/app/features/trips/components/trip-detail/trip-detail.spec.ts`

**Interfaces:**
- Produces: `TripDetail.activeTab` still a `WritableSignal<string>`, now seeded from `ActivatedRoute.queryParamMap`'s `tab` param (falls back to `'overview'` if absent or not one of the 8 known tab ids). No template changes — `[hlmTabsContent]` ids are unchanged.

- [ ] **Step 1: Update the component**

In `trip-detail.ts`, add `toSignal`/`map` imports (the file already imports `toSignal` from `@angular/core/rxjs-interop` and `map` from `rxjs` for `tripId` — reuse them) and change the `activeTab` initialization:

```ts
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { trips } from '@app/core/mock-data';
import { TripOverviewTab } from './tabs/trip-overview-tab/trip-overview-tab';
import { TripMembersTab } from './tabs/trip-members-tab/trip-members-tab';
import { TripTravelTab } from './tabs/trip-travel-tab/trip-travel-tab';
import { TripAccommodationTab } from './tabs/trip-accommodation-tab/trip-accommodation-tab';
import { TripExpensesTab } from './tabs/trip-expenses-tab/trip-expenses-tab';
import { TripItineraryTab } from './tabs/trip-itinerary-tab/trip-itinerary-tab';
import { TripAlertsTab } from './tabs/trip-alerts-tab/trip-alerts-tab';
import { TripReviewsTab } from './tabs/trip-reviews-tab/trip-reviews-tab';

interface TabInfo {
  id: string;
  label: string;
}

const TABS: TabInfo[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'members', label: 'Members' },
  { id: 'travel', label: 'Travel' },
  { id: 'accommodation', label: 'Accommodation' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'reviews', label: 'Reviews' },
];

const VALID_TAB_IDS = new Set(TABS.map((t) => t.id));

@Component({
  selector: 'app-trip-detail',
  imports: [
    RouterLink,
    NgIcon,
    HlmButtonImports,
    HlmBadgeImports,
    HlmTabsImports,
    StatusBadge,
    TripOverviewTab,
    TripMembersTab,
    TripTravelTab,
    TripAccommodationTab,
    TripExpensesTab,
    TripItineraryTab,
    TripAlertsTab,
    TripReviewsTab,
  ],
  templateUrl: './trip-detail.html',
})
export class TripDetail {
  private readonly route = inject(ActivatedRoute);

  protected readonly tabs = TABS;

  private readonly initialTabParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('tab'))),
    { initialValue: null },
  );

  protected readonly activeTab = signal(
    this.initialTabParam() && VALID_TAB_IDS.has(this.initialTabParam()!)
      ? this.initialTabParam()!
      : 'overview',
  );

  private readonly tripId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('tripId'))),
    { initialValue: null },
  );

  public readonly trip = computed(() => trips.find((t) => t.id === this.tripId()) ?? trips[0]);
  public readonly totalBudget = computed(() => this.trip().budgetPerPerson * this.trip().members);
  public readonly pct = computed(() =>
    Math.round((this.trip().currentCost / this.totalBudget()) * 100),
  );
}
```

(Only the `VALID_TAB_IDS` constant, the `initialTabParam` field, and the `activeTab` initializer are new — everything else in the file is unchanged from today.)

- [ ] **Step 2: Update the spec**

In `trip-detail.spec.ts`, update `renderWithTripId` to also stub `queryParamMap` (required — `TripDetail` now reads it unconditionally, so every existing test's `ActivatedRoute` mock needs it or construction throws), and add tab-seeding tests:

```ts
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import {
  lucideAlertTriangle,
  lucideArrowLeft,
  lucideArrowRight,
  lucideBus,
  lucideCalendar,
  lucideCheckCircle2,
  lucideClock,
  lucideMapPin,
  lucidePlus,
  lucideSparkles,
  lucideStar,
  lucideUserPlus,
  lucideUsers,
  lucideWallet,
} from '@ng-icons/lucide';
import { of } from 'rxjs';
import { trips } from '@app/core/mock-data';
import { TripDetail } from '@app/features/trips/components/trip-detail/trip-detail';

const ALL_ICONS = {
  lucideAlertTriangle,
  lucideArrowLeft,
  lucideArrowRight,
  lucideBus,
  lucideCalendar,
  lucideCheckCircle2,
  lucideClock,
  lucideMapPin,
  lucidePlus,
  lucideSparkles,
  lucideStar,
  lucideUserPlus,
  lucideUsers,
  lucideWallet,
};

async function renderWithTripId(
  tripId: string | null,
  queryParams: Record<string, string> = {},
) {
  await TestBed.configureTestingModule({
    imports: [TripDetail],
    providers: [
      provideRouter([]),
      provideIcons(ALL_ICONS),
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(convertToParamMap(tripId ? { tripId } : {})),
          queryParamMap: of(convertToParamMap(queryParams)),
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(TripDetail);
  fixture.detectChanges();
  return fixture;
}

describe('TripDetail', () => {
  it('resolves the trip matching the route tripId', async () => {
    const fixture = await renderWithTripId('manali-winter');
    expect(fixture.componentInstance.trip().id).toBe('manali-winter');
  });

  it('falls back to the first trip when tripId matches nothing', async () => {
    const fixture = await renderWithTripId('does-not-exist');
    expect(fixture.componentInstance.trip()).toBe(trips[0]);
  });

  it('computes totalBudget and pct from the resolved trip', async () => {
    const fixture = await renderWithTripId('goa-2026');
    const trip = trips.find((t) => t.id === 'goa-2026')!;
    const expectedTotal = trip.budgetPerPerson * trip.members;

    expect(fixture.componentInstance.totalBudget()).toBe(expectedTotal);
    expect(fixture.componentInstance.pct()).toBe(
      Math.round((trip.currentCost / expectedTotal) * 100),
    );
  });

  it('renders all 8 tab triggers', async () => {
    const fixture = await renderWithTripId('goa-2026');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const label of [
      'Overview',
      'Members',
      'Travel',
      'Accommodation',
      'Expenses',
      'Itinerary',
      'Alerts',
      'Reviews',
    ]) {
      expect(text).toContain(label);
    }
  });

  it('shows no coming-soon placeholder now that every tab has real content', async () => {
    const fixture = await renderWithTripId('goa-2026');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('This section is coming soon.');
  });

  it('defaults activeTab to overview when no tab query param is present', async () => {
    const fixture = await renderWithTripId('goa-2026');
    expect(fixture.componentInstance.activeTab()).toBe('overview');
  });

  it('seeds activeTab from a recognized tab query param', async () => {
    const fixture = await renderWithTripId('goa-2026', { tab: 'members' });
    expect(fixture.componentInstance.activeTab()).toBe('members');
  });

  it('falls back to overview for an unrecognized tab query param value', async () => {
    const fixture = await renderWithTripId('goa-2026', { tab: 'not-a-real-tab' });
    expect(fixture.componentInstance.activeTab()).toBe('overview');
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npx ng test --watch=false --include="**/trip-detail.spec.ts"`
Expected: all 8 tests PASS.

- [ ] **Step 4: Full build check**

Run: `npx ng build`
Expected: builds clean.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/trips/components/trip-detail/trip-detail.ts frontend/src/app/features/trips/components/trip-detail/trip-detail.spec.ts
git commit -m "feat: seed TripDetail's active tab from a ?tab= query param"
```

---

## Task 4: Post-creation "add members now or later" dialog in `NewTrip`

**Files:**
- Modify: `frontend/src/app/features/trips/components/new-trip/new-trip.ts`
- Modify: `frontend/src/app/features/trips/components/new-trip/new-trip.html`
- Modify: `frontend/src/app/features/trips/components/new-trip/new-trip.spec.ts`

**Interfaces:**
- Consumes: `TravelerPicker` (Task 1), `TripDetail`'s `?tab=` support (Task 3, for manual verification — not a compile-time dependency).
- Consumes: `TripsService.createTrip` (existing, unchanged) and `TripsService.inviteMember` (existing, unchanged).

- [ ] **Step 1: Update the component**

Replace the full contents of `new-trip.ts`:

```ts
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIcon } from '@ng-icons/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { TripsService } from '@app/features/trips/services/trips.service';
import { CreateTripPayload } from '@app/features/trips/services/trip.models';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { Destination } from '@app/core/destinations/destination.models';
import { TravelerPicker } from '@app/features/trips/components/traveler-picker/traveler-picker';
import { TravelerSearchResult } from '@app/core/users/user-search.model';

type DialogStep = 'prompt' | 'picker';

@Component({
  selector: 'app-new-trip',
  imports: [
    RouterLink,
    NgIcon,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSelectImports,
    PageHeader,
    TravelerPicker,
  ],
  templateUrl: './new-trip.html',
})
export class NewTrip {
  private readonly router = inject(Router);
  private readonly tripsService = inject(TripsService);
  private readonly destinationsService = inject(DestinationsService);

  protected readonly tripTypes = ['Solo', 'Couple', 'Family', 'Friends', 'Corporate'];
  protected readonly tripType = signal('Friends');
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly destinations = signal<Destination[]>([]);
  protected readonly destinationsLoading = signal(true);
  protected readonly destinationsError = signal(false);
  protected readonly selectedDestinationId = signal('');

  protected readonly dialogState = signal<'open' | 'closed'>('closed');
  protected readonly dialogStep = signal<DialogStep>('prompt');
  protected readonly createdTripId = signal<string | null>(null);
  protected readonly invitedTravelers = signal<TravelerSearchResult[]>([]);
  protected readonly memberInviteError = signal<string | null>(null);

  protected readonly excludeIds = computed(() => this.invitedTravelers().map((t) => t.id));

  constructor() {
    this.destinationsService.listDestinations().subscribe({
      next: (destinations) => {
        this.destinations.set(destinations);
        this.destinationsLoading.set(false);
        if (destinations.length > 0) {
          this.selectedDestinationId.set(String(destinations[0].destinationId));
        }
      },
      error: () => {
        this.destinationsError.set(true);
        this.destinationsLoading.set(false);
      },
    });
  }

  protected onTripTypeChange(value: string | null | undefined): void {
    if (value) {
      this.tripType.set(value);
    }
  }

  protected onDestinationChange(value: string | null | undefined): void {
    if (value) {
      this.selectedDestinationId.set(value);
    }
  }

  protected destinationLabel(destination: Destination): string {
    return `${destination.destinationName}, ${destination.state}`;
  }

  protected readonly destinationIdToLabel = (id: string): string => {
    const destination = this.destinations().find((d) => String(d.destinationId) === id);
    return destination ? this.destinationLabel(destination) : id;
  };

  protected onSubmit(
    event: Event,
    name: string,
    budget: string,
    source: string,
    startDate: string,
    endDate: string,
  ): void {
    event.preventDefault();
    this.error.set(null);

    if (!this.selectedDestinationId()) {
      this.error.set('Please select a destination.');
      return;
    }

    const categoryId = this.tripTypes.indexOf(this.tripType()) + 1;
    const payload: CreateTripPayload = {
      tripName: name,
      sourceLocation: source,
      destinationId: Number(this.selectedDestinationId()),
      budgetAmount: Number(budget),
      categoryId,
      startDate,
      endDate,
    };

    this.submitting.set(true);
    this.tripsService.createTrip(payload).subscribe({
      next: (trip) => {
        this.submitting.set(false);
        this.createdTripId.set(trip.tripId);
        this.invitedTravelers.set([]);
        this.memberInviteError.set(null);
        this.dialogStep.set('prompt');
        this.dialogState.set('open');
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.error.set(this.extractErrorMessage(err));
      },
    });
  }

  protected onAddMembers(): void {
    this.dialogStep.set('picker');
  }

  protected onCloseDialog(): void {
    this.dialogState.set('closed');
  }

  protected onMemberPicked(traveler: TravelerSearchResult): void {
    const tripId = this.createdTripId();
    if (!tripId) {
      return;
    }
    this.memberInviteError.set(null);
    this.tripsService.inviteMember(tripId, traveler.email).subscribe({
      next: () => {
        this.invitedTravelers.update((list) => [...list, traveler]);
      },
      error: () => {
        this.memberInviteError.set('Could not send the invite. They may already be invited.');
      },
    });
  }

  protected onDialogClosed(): void {
    const tripId = this.createdTripId();
    if (!tripId) {
      return;
    }
    const tab = this.invitedTravelers().length > 0 ? 'members' : 'overview';
    this.router.navigate(['/trips', tripId], { queryParams: { tab } });
  }

  private extractErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const apiError = err.error?.error;
      if (apiError) {
        const details: string[] = apiError.details ?? [];
        return details.length > 0 ? `${apiError.message}\n${details.join('\n')}` : apiError.message;
      }
    }
    return 'Something went wrong creating your trip. Please try again.';
  }
}
```

- [ ] **Step 2: Add the dialog to the template**

Append this block to the end of `new-trip.html`, after the closing `</div>` of the form card (the form card itself is unchanged):

```html
<hlm-dialog [state]="dialogState()" (closed)="onDialogClosed()">
  <ng-template hlmDialogPortal>
    <hlm-dialog-content>
      @if (dialogStep() === 'prompt') {
        <div hlmDialogHeader>
          <h3 hlmDialogTitle>Trip created!</h3>
        </div>
        <p class="text-sm text-muted-foreground">
          Add travel companions now, or invite them later from the Members tab.
        </p>
        <div hlmDialogFooter>
          <button hlmBtn variant="outline" (click)="onCloseDialog()">I'll do it later</button>
          <button hlmBtn (click)="onAddMembers()">Add Members</button>
        </div>
      } @else {
        <div hlmDialogHeader>
          <h3 hlmDialogTitle>Add members</h3>
        </div>
        <div class="space-y-2">
          <label hlmLabel for="new-trip-member-search">Traveler</label>
          <app-traveler-picker
            inputId="new-trip-member-search"
            [excludeIds]="excludeIds()"
            (selected)="onMemberPicked($event)"
          />
        </div>
        @if (invitedTravelers().length > 0) {
          <div class="flex flex-wrap gap-2">
            @for (t of invitedTravelers(); track t.id) {
              <span hlmBadge variant="outline">{{ t.name }}</span>
            }
          </div>
        }
        @if (memberInviteError()) {
          <p class="text-xs text-destructive">{{ memberInviteError() }}</p>
        }
        <div hlmDialogFooter>
          <button hlmBtn (click)="onCloseDialog()">Done</button>
        </div>
      }
    </hlm-dialog-content>
  </ng-template>
</hlm-dialog>
```

- [ ] **Step 3: Update the spec**

Replace the full contents of `new-trip.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { NewTrip } from '@app/features/trips/components/new-trip/new-trip';
import { TripsService } from '@app/features/trips/services/trips.service';
import { CreateTripPayload, Trip, TripMember } from '@app/features/trips/services/trip.models';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { Destination } from '@app/core/destinations/destination.models';
import { TravelerSearchResult } from '@app/core/users/user-search.model';

const SAMPLE_DESTINATIONS: Destination[] = [
  { destinationId: 1, destinationName: 'Mumbai', state: 'Maharashtra', country: 'India', description: '' },
  { destinationId: 2, destinationName: 'Goa', state: 'Goa', country: 'India', description: '' },
];

const CREATED_TRIP: Trip = {
  tripId: 'bbbbbbbb-0000-0000-0000-000000000002',
  tripName: 'Goa Beach Escape',
  organizer: { userId: 'u1', name: 'Alice', email: 'alice@travelease.test' },
  sourceLocation: 'Bengaluru',
  destinationId: 1,
  budgetAmount: 18000,
  categoryId: 4,
  startDate: '2026-08-01',
  endDate: '2026-08-05',
  status: 'PLANNING',
  viewerRole: 'ORGANIZER',
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};

const CARA: TravelerSearchResult = { id: 'u3', name: 'Cara Traveler', email: 'cara@travelease.test' };

const CARA_MEMBER: TripMember = {
  tripMemberId: 'eeeeeeee-0000-0000-0000-000000000005',
  userId: 'u3',
  name: 'Cara Traveler',
  email: 'cara@travelease.test',
  memberStatus: 'INVITED',
  joinedDate: '2026-07-02T00:00:00Z',
  budgetAmount: 0,
  spentAmount: 0,
};

async function setup(
  tripsService: Partial<TripsService>,
  destinationsService: Partial<DestinationsService> = { listDestinations: () => of(SAMPLE_DESTINATIONS) },
) {
  await TestBed.configureTestingModule({
    imports: [NewTrip],
    providers: [
      provideRouter([]),
      provideIcons({ lucideArrowLeft }),
      { provide: TripsService, useValue: tripsService },
      { provide: DestinationsService, useValue: destinationsService },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(NewTrip);
  const router = TestBed.inject(Router);
  const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, navigateSpy };
}

function fillAndSubmit(el: HTMLElement) {
  (el.querySelector('#name') as HTMLInputElement).value = 'Goa Beach Escape';
  (el.querySelector('#budget') as HTMLInputElement).value = '18000';
  (el.querySelector('#source') as HTMLInputElement).value = 'Bengaluru';
  (el.querySelector('#start-date') as HTMLInputElement).value = '2026-08-01';
  (el.querySelector('#end-date') as HTMLInputElement).value = '2026-08-05';
  const form = el.querySelector('form')!;
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

function instance(fixture: ReturnType<typeof TestBed.createComponent<NewTrip>>) {
  return fixture.componentInstance as unknown as {
    dialogState: () => 'open' | 'closed';
    dialogStep: () => 'prompt' | 'picker';
    invitedTravelers: () => TravelerSearchResult[];
    onAddMembers: () => void;
    onCloseDialog: () => void;
    onMemberPicked: (t: TravelerSearchResult) => void;
    onDialogClosed: () => void;
  };
}

describe('NewTrip', () => {
  it('creates the trip with the default trip type and first-loaded destination, then opens the add-members prompt', async () => {
    const createTrip = vi.fn().mockReturnValue(of(CREATED_TRIP));
    const { fixture, navigateSpy } = await setup({ createTrip });
    const el = fixture.nativeElement as HTMLElement;

    fillAndSubmit(el);
    await fixture.whenStable();
    fixture.detectChanges();

    const expectedPayload: CreateTripPayload = {
      tripName: 'Goa Beach Escape',
      sourceLocation: 'Bengaluru',
      destinationId: 1,
      budgetAmount: 18000,
      categoryId: 4,
      startDate: '2026-08-01',
      endDate: '2026-08-05',
    };
    expect(createTrip).toHaveBeenCalledWith(expectedPayload);
    expect(instance(fixture).dialogState()).toBe('open');
    expect(instance(fixture).dialogStep()).toBe('prompt');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('shows validation error details and does not navigate on failure', async () => {
    const httpError = new HttpErrorResponse({
      status: 400,
      error: {
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: ['budgetAmount: must be greater than or equal to 0.01'],
        },
      },
    });
    const createTrip = vi.fn().mockReturnValue(throwError(() => httpError));
    const { fixture, navigateSpy } = await setup({ createTrip });
    const el = fixture.nativeElement as HTMLElement;

    fillAndSubmit(el);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Validation failed');
    expect(el.textContent).toContain('budgetAmount: must be greater than or equal to 0.01');
  });

  it('shows an error and disables submit when destinations fail to load', async () => {
    const createTrip = vi.fn();
    const { fixture } = await setup(
      { createTrip },
      { listDestinations: () => throwError(() => new Error('boom')) },
    );
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Could not load destinations');
    const submitBtn = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('navigates to the overview tab when the organizer closes without adding anyone', async () => {
    const createTrip = vi.fn().mockReturnValue(of(CREATED_TRIP));
    const { fixture, navigateSpy } = await setup({ createTrip });
    const el = fixture.nativeElement as HTMLElement;
    fillAndSubmit(el);
    await fixture.whenStable();

    // The dialog's overlay content renders via a CDK Overlay attached to
    // document.body, not fixture.nativeElement — calling the (protected)
    // handlers directly tests the same close-request + navigation-decision
    // logic without a brittle, unproven overlay-query (same trade-off already
    // accepted in trip-members-tab.spec.ts).
    instance(fixture).onCloseDialog();
    instance(fixture).onDialogClosed();

    expect(navigateSpy).toHaveBeenCalledWith(['/trips', CREATED_TRIP.tripId], {
      queryParams: { tab: 'overview' },
    });
  });

  it('invites picked travelers and navigates to the members tab once done', async () => {
    const createTrip = vi.fn().mockReturnValue(of(CREATED_TRIP));
    const inviteMember = vi.fn().mockReturnValue(of(CARA_MEMBER));
    const { fixture, navigateSpy } = await setup({ createTrip, inviteMember });
    const el = fixture.nativeElement as HTMLElement;
    fillAndSubmit(el);
    await fixture.whenStable();

    instance(fixture).onAddMembers();
    instance(fixture).onMemberPicked(CARA);
    await fixture.whenStable();

    expect(inviteMember).toHaveBeenCalledWith(CREATED_TRIP.tripId, 'cara@travelease.test');
    expect(instance(fixture).invitedTravelers()).toEqual([CARA]);
    expect(instance(fixture).dialogStep()).toBe('picker');

    instance(fixture).onCloseDialog();
    instance(fixture).onDialogClosed();

    expect(navigateSpy).toHaveBeenCalledWith(['/trips', CREATED_TRIP.tripId], {
      queryParams: { tab: 'members' },
    });
  });

  it('shows an inline error when a member invite fails, without navigating early', async () => {
    const createTrip = vi.fn().mockReturnValue(of(CREATED_TRIP));
    const inviteMember = vi.fn().mockReturnValue(throwError(() => new Error('boom')));
    const { fixture } = await setup({ createTrip, inviteMember });
    const el = fixture.nativeElement as HTMLElement;
    fillAndSubmit(el);
    await fixture.whenStable();

    instance(fixture).onAddMembers();
    instance(fixture).onMemberPicked(CARA);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.textContent).toContain('Could not send the invite');
    expect(instance(fixture).invitedTravelers()).toEqual([]);
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `npx ng test --watch=false --include="**/new-trip.spec.ts"`
Expected: all 6 tests PASS.

- [ ] **Step 5: Full regression + build**

Run: `npx ng test --watch=false`
Expected: entire suite PASSES (no regressions in unrelated specs).

Run: `npx ng build`
Expected: builds clean.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/trips/components/new-trip/
git commit -m "feat: add-members-now-or-later dialog after trip creation"
```

- [ ] **Step 7: Manual verification**

Start the backend (`./mvnw spring-boot:run` from `backend/`) and frontend (`npx ng serve` from `frontend/`). Log in as `alice@travelease.test` / `password123` (seeded demo user).

1. Go to `/trips/new`, fill in the form, submit. Confirm the "Trip created!" dialog appears (no navigation yet).
2. Click "Add Members". Search "bob", pick "Bob Traveler" — confirm a chip appears and no error shows.
3. Search "cara", pick "Cara Traveler" — confirm a second chip appears, and that searching "bob" again no longer shows Bob (excluded).
4. Click "Done" — confirm the browser lands on `/trips/{id}?tab=members` with the Members tab active, showing both Bob and Cara as `INVITED`.
5. Repeat trip creation with a new name; this time click "I'll do it later" at the prompt step — confirm landing on `/trips/{id}?tab=overview` (Overview tab active) with no new invites sent.
6. On the Members tab of an existing trip, open "Invite Member", pick two people in one sitting, confirm both appear as chips and the dialog stays open until "Done"/X is clicked.

---

## Self-Review Notes

- **Spec coverage:** Every "Decisions" bullet in the design doc maps to a task — `TravelerPicker` extraction (Task 1), invite-on-pick + chip trail unification across both dialogs (Tasks 2 & 4), unified `(closed)`-based navigation (Task 4), `?tab=` query param (Task 3), existing-members exclusion (Task 2). Out-of-scope items (bus/hotel wiring, batch invites, undo) are not implemented anywhere in this plan, matching Scope.
- **Placeholder scan:** no TBD/TODO; every step has runnable code and exact commands.
- **Type consistency:** `TravelerSearchResult { id, name, email }` used identically across `traveler-picker.ts`, `trip-members-tab.ts`, and `new-trip.ts`. `excludeIds: string[]` / `selected: output<TravelerSearchResult>()` signatures match on both call sites (Task 2 and Task 4). `TripMember.userId` (string) is what's unioned with `TravelerSearchResult.id` (string) in Task 2's `excludeIds` — same type, no mismatch.
