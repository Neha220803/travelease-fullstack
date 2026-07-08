# Add Members During Trip Creation — Design

## Context

Follows [2026-07-08-invitations-members-api-integration-design.md](2026-07-08-invitations-members-api-integration-design.md),
which wired the Members tab's "Invite Member" dialog to the real backend: a `TravelerSearchResult`
typeahead (`GET /api/users/search?q=`) lets the organizer search registered travelers by name/email
and select one, and submitting invites them via `POST /api/trips/{tripId}/members`.

Today, after `NewTrip.onSubmit()` successfully creates a trip, it navigates straight to
`/trips/{tripId}` with no opportunity to add companions. The user wants a prompt right after
creation — "add members now or later?" — and if "now," an inline UI to search and add several
people before moving on.

This spec covers **only** the post-creation member-adding flow. Wiring the currently-static
`TripTravelTab` (bus search) and `TripAccommodationTab` (hotel search) to real destination-based
search APIs are explicitly out of scope — both are static UI prototypes today (per
[2026-07-06-trip-detail-members-travel-design.md](2026-07-06-trip-detail-members-travel-design.md)
and its accommodation/expenses sibling spec) and each needs its own design once picked up.

**Verified before writing this spec:** `HlmDialog extends BrnDialog` directly, inheriting a
`state: InputSignal<'open' | 'closed' | null>` input and a `closed`/`stateChanged` output pair.
This means a dialog can be opened and closed entirely programmatically (`[state]="dialogState()"`)
with no `hlmDialogTrigger` button — required here since the new dialog must pop up automatically
right after trip creation succeeds, not from a user click.

## Decisions

**Shared `TravelerPicker` component.** The typeahead (debounced search, `hlm-autocomplete`
markup, `itemToString`/`isSameMember` helpers) is extracted out of `TripMembersTab` into a new
standalone component at
`features/trips/components/traveler-picker/traveler-picker.ts`:
- Input `excludeIds: string[]` (default `[]`) — result list filters out any `TravelerSearchResult`
  whose `id` is in this list.
- Output `selected` — emits the picked `TravelerSearchResult`.
- On pick: emits `selected`, then clears its own search text/value/results signals immediately,
  so it's ready for the next search without the caller having to reset anything.

**Both dialogs become invite-on-pick.** `TripMembersTab`'s existing "Invite Member" dialog is
simplified to match the new flow: picking a person in `TravelerPicker` invites them immediately
(`POST /api/trips/{tripId}/members`), appends them to a running "Invited" chip list, and the
dialog stays open for adding more people in the same sitting. The old `selectedMember` signal and
separate "Send Invite" submit button are removed — there is no longer a form, just picker +
chips + a "Done" button.

**`excludeIds` covers existing members too, not just this-session picks.** For `TripMembersTab`,
`excludeIds` is the union of `members().map(m => m.userId)` and this session's invited ids —
otherwise someone already on the trip (any status) would still appear in search and picking them
would just surface the backend's "already a member"/"already invited" error. `NewTrip`'s dialog
has no pre-existing members (the trip is brand new), so its `excludeIds` is only the
this-session invited list, as already described below.

**New post-creation dialog, owned by `NewTrip`.** After `createTrip()` succeeds, `NewTrip` sets
local signals `dialogState = signal<'open' | 'closed'>('open')` and
`dialogStep = signal<'prompt' | 'picker'>('prompt')` instead of navigating immediately:
- Step `'prompt'`: "Trip created! Add travel companions now, or invite them later?" with
  `[I'll do it later]` / `[Add Members]` buttons. "Later" closes the dialog with zero invites
  sent. "Add Members" advances `dialogStep` to `'picker'`.
- Step `'picker'`: the same `TravelerPicker` + "Invited" chip list + "Done" pattern as the
  Members tab dialog, scoped to the newly created trip's id.

**Unified exit → navigation.** Rather than branching per button, a single `(closed)` handler on
`<hlm-dialog>` performs the navigation once, regardless of which button (or backdrop/Escape)
closed it: navigates to `/trips/{tripId}?tab=members` if `invitedIds().length > 0`, otherwise
`/trips/{tripId}?tab=overview`. This makes "Later" (0 invites) land on Overview and "Done" (≥1
invite) land on Members without special-casing each exit path.

**`TripDetail` reads an initial tab from the query param.** `activeTab = signal('overview')`
becomes seeded from `?tab=` via `ActivatedRoute.queryParamMap`, defaulting to `'overview'` when
absent or unrecognized. The `hlm-tabs` binding (`[tab]="activeTab()"
(tabActivated)="activeTab.set($event)"`) is unchanged — only the initial value changes to reflect
the query param once, on load.

**Invite failures don't block progress.** If an invite call fails (e.g. already a member), an
inline error shows near the picker (reusing the existing `inviteError` pattern) and the picker
stays open for another attempt; chips already added are unaffected. Search failures continue to
resolve to an empty result list (existing `catchError` behavior), no error UI for search itself.

## Scope

**In scope:**
- `TravelerPicker` — new shared component (extracted from `TripMembersTab`).
- `TripMembersTab` — dialog reworked to invite-on-pick with a running "Invited" chip list;
  `TravelerPicker` replaces the inline `hlm-autocomplete` markup.
- `NewTrip` — post-creation dialog (`prompt` → `picker` steps), unified close-based navigation
  with the `?tab=` query param.
- `TripDetail` — reads `?tab=` query param to seed initial `activeTab`.

**Explicitly out of scope:**
- Any changes to `TripTravelTab` or `TripAccommodationTab` (bus/hotel search) — separate specs.
- Batch/bulk invite endpoints — invites remain one HTTP call per pick, same as today.
- Removing/undoing an invite from within either dialog (use the Members tab's existing "Remove"
  action after the fact).

## Testing

- `traveler-picker.spec.ts` (new): debounces search input before calling the service; filters out
  ids present in `excludeIds`; emits `selected` on pick; clears its own state after emitting.
- `trip-members-tab.spec.ts` (updated): picking a traveler via `TravelerPicker` invites them and
  appends a chip; a failed invite shows the inline error and leaves the chip list unchanged.
- `new-trip.spec.ts` (updated): a successful create opens the dialog at the `'prompt'` step;
  clicking "I'll do it later" navigates to `/trips/{id}?tab=overview` with no invite calls made;
  clicking "Add Members" advances to the `'picker'` step; picking a traveler invites them and
  shows a chip; closing the dialog after ≥1 invite navigates to `/trips/{id}?tab=members`.
- `trip-detail.spec.ts` (updated): `activeTab` defaults to `'overview'` with no query param, and
  reflects `?tab=members` when present.

## Verification

- `ng build` and `ng test` succeed with no regressions.
- Manual: log in as a traveler, create a trip, choose "Add Members" in the popup, search and pick
  two real seeded travelers (confirm each invite hits the real backend), click "Done", confirm
  landing on the Members tab showing both as `INVITED`. Repeat trip creation choosing "I'll do it
  later" instead, confirm landing on Overview with no invites sent. Confirm the Members tab's own
  "Invite Member" dialog still works standalone with the new invite-on-pick + chip-list behavior.
