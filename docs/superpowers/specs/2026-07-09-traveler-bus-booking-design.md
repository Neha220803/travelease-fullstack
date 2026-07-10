# Traveler Bus Booking — Frontend Design & Backend Integration Spec

**Date:** 2026-07-09
**Actor:** ROLE_TRAVELER
**Status:** Design approved section-by-section (A–H). Not yet implemented.

## Scope

In scope: bus search, seat selection, fare/coupon preview, booking creation, simulated payment, ticket/QR display and public verification, booking history/detail/modification, full and partial cancellation, refund visibility, and Traveler Trip Bus Booking attachment/detachment — for ROLE_TRAVELER only.

Explicitly out of scope: all ROLE_PROVIDER management functionality (Bus/Driver/Conductor/Maintenance/Schedule CRUD, operational Bus Trip assignment, Provider analytics/reports), Hotel Booking frontend, Activity Booking frontend, and any redesign of the deferred question "Can ACCEPTED Trip members contribute their own bookings?" (remains deferred, unanswered, unmodified).

Backend production code is **not modified** by this feature. All integration works against the existing `com.travelease.backend.busbooking` package as-is.

**Visual conventions**: Spartan UI + Tailwind CSS throughout, following the existing Traveler visual language exactly as established by `trip-list.html` and sibling Traveler pages — plain `hlmCard` grids, simple inline-text loading/error/empty states, `<app-page-header>` with an action-slot button. This is **not** the Transport Provider dashboard's skeleton-heavy convention; no visual redesign of the existing Traveler shell/pages is introduced anywhere in this feature.

## Architecture decision

**Standalone top-level Traveler feature** (`features/bus-booking/`), not Trip-embedded-only. The existing Trip-context entry point (Trip Detail → Bus Bookings tab) reuses the same components/services rather than maintaining a second implementation — Trip context is an optional entry context, never a hidden global assumption baked into the shared flow.

---

## Section A — Current Frontend Audit

The only existing Bus Booking UI in the Traveler frontend is `features/trips/components/trip-detail/tabs/trip-travel-tab/` (`.ts`/`.html`), embedded as a Trip Detail tab.

| Piece | Classification |
|---|---|
| Search + seat grid + inline booking (`trip-travel-tab`) | **KEEP BUT REFACTOR** — real API calls already work; strip Trip-only assumptions (seat cap = member count, hardcoded passenger age/gender, forced immediate `attachBookingToTrip`); extract reusable search/seat pieces into the new standalone feature |
| Passenger detail form | **NEW COMPONENT REQUIRED** (currently hardcoded `passengerAge: 25, passengerGender: 'Other'` for every passenger, not a real form) |
| Payment/checkout step | **NEW COMPONENT REQUIRED** (nothing exists) |
| Booking confirmation screen | **NEW COMPONENT REQUIRED** (currently just a toast) |
| Ticket/QR display | **NEW COMPONENT REQUIRED** (nothing exists) |
| Ticket verification | **NEW COMPONENT REQUIRED** (backend endpoint exists, public, unused by frontend) |
| My Bookings history + detail | **NEW PAGE REQUIRED** (only a trip-scoped list exists today, via `getTripBusBookings`) |
| Cancellation UI | **NEW COMPONENT REQUIRED** (nothing exists) |
| Refund UI | **NEW COMPONENT REQUIRED** (nothing exists) |

`frontend/src/app/core/mock-data.ts` fixtures (`buses`, `hotelBookings`, a `type: "booking"` notification, an alerts mock, an expense-list mock) are confirmed dead/unused by any real bus-booking code path and are not touched by this feature.

Traveler nav (`app-shell.ts` `NAV_MAP.traveler`) currently has no Bookings entry: Dashboard, My Trips, Invitations, Notifications, Contact Support, Profile.

---

## Section B — Backend Workflow & Endpoint Map

Reconstructed end-to-end workflow for a logged-in Traveler, all endpoints verified directly against controller/service source (not Swagger descriptions):

1. **Search**: `GET /api/schedules/search` (public route family, `permitAll` in `SecurityConfig`) → `BusSearchResponse[]` (no `routeId`, has `busType`).
2. **Seats**: `GET /api/seats?scheduleId=` → `SeatLayoutResponse` (only truly-available seats returned; see Section D for the corrected seat model).
3. **Lock**: `POST /api/seats/lock` → `SeatLockResponse` (5-minute TTL via `SeatLock` entity + a real `SeatLockScheduler` running every 60s).
4. **Fare preview**: `POST /api/fares/calculate` → `PriceCalculatorResponse{breakdown: FareBreakdownResponse, totalPayable, totalSavings}`.
5. **Booking creation**: `POST /api/bookings` (`BookingRequest`) — creates `PENDING`, then immediately auto-confirms internally (`confirmBookingInternal`), simulating payment synchronously (no real gateway, no separate payment step/webhook exists anywhere in the backend).
6. **Coupon**: applied automatically during fare calc (`FareServiceImpl`, `couponService.findBestDiscount`) and again, separately, at booking-confirm time — see the locked "booking-time coupon quirk" below.
7. **Confirmation**: booking reaches `CONFIRMED`, ticket + QR string generated.
8. **Ticket/QR**: `GET /api/bookings/{id}/ticket`; public verification `GET /api/bookings/ticket/verify/{ticketNumber}`.
9. **My Bookings / detail / timeline**: `GET /api/bookings`, `GET /api/bookings/{id}`, `GET /api/bookings/{id}/timeline`.
10. **Modify**: `PUT /api/bookings/modify` — contact + passenger details only.
11. **Cancel (full/partial)**: `POST /api/bookings/{id}/cancel`, `POST /api/bookings/cancel/partial`.
12. **Refunds**: `GET /api/refunds?bookingId=`, `GET /api/refunds/{id}` — booking-scoped only.
13. **Trip attachment**: `POST/DELETE/GET /api/trips/{tripId}/bus-bookings`.

**Locked lifecycle/UX facts:**
- **Seat lock countdown**: real 5-minute TTL (`SeatLock.expiresAt`), auto-expired by a real scheduler.
- **`Booking.expiresAt` / 15-minute field**: exists on the entity and is set at creation, but is **decorative** — no scheduler ever reads or acts on it (`expireBookings()` is never invoked). Do not build any frontend countdown/urgency UI around it.
- **Payment**: synchronous simulation inside `confirmBookingInternal`. No pending/processing async state exists — the frontend's "Processing…" spinner covers exactly one HTTP call, nothing more.
- **Coupon**: validated twice — once during fare preview (informational), once at booking-confirm time. If the second validation throws for *any* reason, the exception is swallowed, a timeline note is written, and the booking **still succeeds at full fare** (`couponDiscount = 0.0`). This is a locked, documented backend behavior, not a bug to fix.
- **Refund**: auto-driven through its entire lifecycle (`INITIATED→PROCESSING→APPROVED→COMPLETED`) synchronously inside the cancel call — no pending/polling state ever reaches the frontend.
- **Notifications**: booking/cancellation/refund actions do not independently push traveler notifications beyond what already exists generally (no new notification integration invented here).
- **Ticket/QR**: `TicketResponse.qrCodeString` is a raw string rendered client-side; no backend QR image endpoint exists or is invented.
- **Trip attachment**: an Organizer or ACCEPTED Trip member may attach/detach an *independently owned* eligible Bus Booking to/from a *mutable* Trip (see Section C/G — this corrects an earlier "Organizer-only" misstatement).

---

## Section C — Authorization, Ownership, Trip & Lifecycle Model

Four distinct layers, never conflated:

1. **RBAC** (route-level): `BookingController` and `TripBusBookingController` are inconsistent — `TripBusBookingController` carries explicit `@PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")` on all three endpoints, while **`BookingController` has no `@PreAuthorize` at all**; its only gate is `SecurityConfig`'s catch-all `anyRequest().authenticated()`. **Classification: BACKEND AUTHORIZATION GAP — DOCUMENTED, NOT FIXED IN THIS FRONTEND TASK.** In practice this means a Transport/Hotel/Activity Provider account, being merely "authenticated," could technically call `POST /api/bookings` at the URL-permission level; the frontend does not attempt to compensate for this server-side gap — it is out of scope to fix, and is noted here for visibility only.
2. **Resource ownership**: enforced per-call via `SecurityUtil.getCurrentUserId()` + `ensureOwnership(booking)` (owner or ROLE_ADMIN only) across get/timeline/modify/cancel/partial-cancel. Refund ownership is enforced *indirectly*, via a discarded side-effect call to `bookingService.getBookingById(...)` inside `RefundController` (documented in that controller's own Javadoc).
3. **Trip relationship authorization**: `TripAuthorizationService.requireMember` — organizer, or a Trip member with `TripMemberStatus.ACCEPTED` (not INVITED/REJECTED), or ADMIN. Distinct from resource ownership: Trip access answers "can this user see/touch this Trip," not "does this user own this Booking."
4. **Trip lifecycle authorization**: `TripAuthorizationService.requireMutableTrip` — blocks all Bus Booking attach/detach once a Trip is `COMPLETED` or `CANCELLED`. **This check has no ADMIN bypass** — deliberately, per its own source comment, since it's a fact about the Trip's state, not about the caller.

**Trip attachment model (corrected)**: attaching/detaching requires **both** Trip relationship authorization (layer 3) **and** Booking ownership (layer 2) — an organizer cannot attach or detach a fellow accepted member's booking merely by sharing the Trip. Listing attached bookings (`GET /api/trips/{tripId}/bus-bookings`) requires only layer 3, returning the privacy-preserving `TripBusBookingResponse` (excludes passenger names/ages/genders, contact details, ticket/QR, timeline — by explicit DTO design).

The deferred question ("Can ACCEPTED members contribute their own bookings to the shared Trip?") remains deferred — not answered, not modified.

---

## Section D — Search, Seat Selection, Fare, Coupon UX

### Seat model correction (supersedes any earlier assumption)

Real backend enums:
- `SeatType`: `WINDOW, AISLE, LADIES, RESERVED, DRIVER`
- `SeatStatus`: `AVAILABLE, BOOKED, BLOCKED, MAINTENANCE`

The frontend's pre-existing `schedule.models.ts` unions (`'SEATER'|'SEMI_SLEEPER'|'SLEEPER'` and `'AVAILABLE'|'BLOCKED'|'BOOKED'|'LOCKED'`) are wrong and must be replaced outright — not merged, not kept as a fallback.

**No per-seat lock visibility exists.** `GET /api/seats?scheduleId=` (`SeatServiceImpl.getSeats` → `findAvailableSeatsForSchedule`) excludes only seats with a `CONFIRMED` `BookingSeat` for that schedule; it never references `SeatLock`. A seat someone else is actively holding still appears as available and clickable. The only place a conflict surfaces is `POST /api/seats/lock`, which throws `SeatUnavailableException` → **HTTP 409, code `SEAT_UNAVAILABLE`** if another user's active lock exists. Re-locking a seat the same user already holds is idempotent (extends `expiresAt`).

**Locked interaction model:**
```
Traveler clicks an available seat
  → immediately POST /api/seats/lock for the current selection
  → on success: mark HELD BY CURRENT USER, countdown derived only from SeatLockResponse.expiresAt
  → on 409 SEAT_UNAVAILABLE: show a concise conflict message, remove/reconcile the seat from
    local selection, refetch GET /api/seats?scheduleId=, refresh the grid.
    Never show booking success. Never pretend the seat was reserved.
```
`GET /api/seats/schedule/{scheduleId}/occupancy` provides only aggregate counts (`totalSeats, bookedSeats, availableSeats, lockedSeats, occupancyPercentage`) for a summary badge — never a per-seat breakdown. LADIES-type seats get a data-driven badge on the grid.

### Fare / Coupon (source-verified against `PriceCalculatorResponse`, `FareBreakdownResponse`, `FareCalculationRequest`, `CouponResponse`, `BusSearchResponse`, `SmartSearchResponse`, `ScheduleResponse`, `FareServiceImpl`, `CouponServiceImpl`)

- `routeId`/`busType` are available from `FareBreakdownResponse` (nested inside `PriceCalculatorResponse.breakdown`), never assumed to live directly on `PriceCalculatorResponse`, never invented, never derived from display text.
- Fare preview: `POST /api/fares/calculate` (`FareCalculationRequest{scheduleId, seatIds, couponCode?}`) → full breakdown including per-seat fare, discounts, coupon discount, GST/tax, cancellation-preview fields, `finalAmount`.
- Coupon eligibility is checked via the fare-preview call itself (no separate "validate coupon" UI call invented); the coupon actually applied at booking-confirm time is independently re-validated server-side and can silently fail to full fare (Section B's locked coupon quirk) — the UI must not assume the previewed coupon discount is guaranteed to apply.

---

## Section E — Booking Creation, Passenger Details, Payment, Confirmation, Ticket

### Verified DTOs
- `BookingRequest{scheduleId, seatIds, passengerDetails: PassengerDetailDto[], couponCode?, contactEmail?, contactPhone?}`.
- `PassengerDetailDto` (exact class name — not "PassengerDetailRequest"): `{seatId, passengerName, passengerAge, passengerGender: String, passengerEmail, passengerPhone, isPrimary}` — **zero validation annotations**; the frontend form must perform its own required-field validation.
- `BookingStatus{PENDING, RESERVED, CONFIRMED, FAILED, CANCELLED, COMPLETED, EXPIRED}`; `PaymentStatus{PENDING, COMPLETED, FAILED, REFUNDED}`.
- Only `GET /api/bookings/{id}/ticket` and `GET /api/bookings/ticket/verify/{ticketNumber}` are real routed ticket endpoints. `reprintTicket`/`revalidateTicket`/`regenerateTicket` exist on the service but have no controller route — dead code, not usable.

### Primary passenger (`isPrimary`)
No backend cardinality enforcement exists (`BookingServiceImpl` lines ~125-131): the first passenger marked `true` — or the first passenger overall if none is marked — silently becomes primary; extra `true` values are silently ignored. **Classification: FRONTEND UX CONVENTION, not a backend rule.** Design: a single-select radio group, exactly one row checked, defaulting to the first passenger — deliberately mirroring the backend's own default rather than inventing a stricter or looser rule.

### LADIES-seat gender rule
`SeatAllocationServiceImpl.validateLadiesSeats`: case-insensitive comparison (`equalsIgnoreCase("FEMALE")`), free-text `String` field (no backend enum). Frontend gender `<select>` submits exact values `FEMALE`/`MALE`/`OTHER`; rows bound to a `LADIES` seat lock the select to `FEMALE` client-side with explanatory copy, while the true enforcement stays server-side (a 409 must still be handled gracefully if triggered).

### Ticket Verification
`GET /api/bookings/ticket/verify/{ticketNumber}` is genuinely public (`SecurityConfig`: `permitAll` on `/api/bookings/ticket/verify/**`, no `@PreAuthorize` on the controller method). It is a standalone, unauthenticated route — outside the traveler auth guard — reusing the same ticket-display component as the authenticated "My Bookings → Ticket" view where practical.

### QR rendering
No QR library exists in `package.json` today. A small new frontend dependency is required to render `TicketResponse.qrCodeString` client-side. No backend QR image endpoint is assumed or invented. **No "download ticket as PDF" action is included** — nothing on the backend generates a PDF or any downloadable asset; inventing one would be fake behavior. The ticket screen displays data and the client-rendered QR only.

### Flow
Search → Seat Selection → Passenger Details → Review & Payment → (backend booking submission) → Confirmation. Confirmation and Ticket are post-success terminal views only, never reachable before `POST /api/bookings` succeeds. Seat locks persist visibly (countdown) across every step; near-expiry warns proactively, actual expiry blocks submission and routes back to Seat Selection. No real payment gateway UI is introduced — "Confirm & Pay" triggers exactly one synchronous call.

---

## Section F — My Bookings, Detail/Timeline, Modification, Cancellation, Refund

### ⚠️ Backend contract inconsistency (documented, not fixed)
The cancellation **preview** (`GET /api/fares/cancellation-preview/{scheduleId}?totalFare=`, `FareServiceImpl.getCancellationPreview`) computes its percentage from **`FareRule.cancellationChargePercent`/`refundPercent`**. The **actual** charge applied at real cancel time (`BookingServiceImpl.calculateCancellationCharge`) comes from a completely separate, independently-configured entity: **`CancellationPolicy.cancellationChargePercent`**. Both default to 10%/90% if unconfigured, but can diverge in real data. **Mitigation baked into the UI**: the preview figure is always labeled "Estimated"; the authoritative numbers are taken only from the real `CancellationResponse` returned by the actual cancel action.

### Verified contracts

| Operation | Endpoint | Eligible status | Ownership | Notes |
|---|---|---|---|---|
| List | `GET /api/bookings?scope=&status=&reference=&from=&to=` | any | auto-scoped server-side | `scope=UPCOMING\|PAST` |
| Detail | `GET /api/bookings/{id}` | any | `ensureOwnership` | |
| Timeline | `GET /api/bookings/{id}/timeline` | any | `ensureOwnership` | |
| Modify | `PUT /api/bookings/modify` | not CANCELLED/COMPLETED/EXPIRED/FAILED | `ensureOwnership` | contact + passenger fields only — never seats/fare/coupon/Trip attachment |
| Full cancel | `POST /api/bookings/{id}/cancel` | CONFIRMED/PENDING/RESERVED | `ensureOwnership` | terminal |
| Partial cancel | `POST /api/bookings/cancel/partial` | **CONFIRMED only** | `ensureOwnership` | rejects cancelling every seat: *"Cannot cancel all seats. Use full cancellation instead."* — **the UI disables confirmation and shows this exact message; it does not auto-convert to full cancellation** |
| Cancellation preview | `GET /api/fares/cancellation-preview/{scheduleId}?totalFare=` | n/a | **none** (stateless calculator) | label as "Estimated" |
| Refund by booking | `GET /api/refunds?bookingId=`, `GET /api/refunds/{id}` | n/a | indirect, via discarded `getBookingById` call | |
| Refund list, no bookingId | `GET /api/refunds` | n/a | **ADMIN only** | no "My Refunds" page is possible |
| Refund status transition | `PATCH /api/refunds/{id}/status` | n/a | `@PreAuthorize("hasRole('ADMIN')")` | out of Traveler scope |

Refunds are auto-completed synchronously within the cancel call — no pending/polling UI. Refund visibility is exclusively (a) inline in the `CancellationResponse` right after cancelling, and (b) refetched from a specific booking's detail view — never a standalone list.

---

## Section G — Trip Bus Booking Attachment/Detachment

Attach (`POST /api/trips/{tripId}/bus-bookings`): requires Trip relationship (organizer/ACCEPTED member/ADMIN) **and** booking ownership **and** a mutable Trip. Eligible booking statuses: only `CONFIRMED` or `COMPLETED`. Idempotent re-attach to the same Trip; rejects attaching to a second Trip while already attached elsewhere.

Detach (`DELETE .../bus-bookings/{bookingId}`): same Trip-relationship + mutable-Trip gates, but ownership is **booking-owner-only** — deliberately stricter than the Hotel Booking precedent; the organizer does not gain detach rights over a fellow member's booking.

List (`GET .../bus-bookings`): Trip relationship only, no ownership check — returns the privacy-preserving `TripBusBookingResponse`.

**UI design:**
- Trip Detail → Bus Bookings tab: aggregate summary + per-booking rows (route, date, fare, status, "Booked by [name]"), Detach button shown only on the current user's own rows. Attach/Detach hidden entirely once the Trip is COMPLETED/CANCELLED, for every viewer including ADMIN (no lifecycle bypass exists).
- Attach entry points: from My Bookings (picker filtered to the user's own organizer/ACCEPTED, non-terminal Trips), and from the Trip-context booking flow's Confirmation screen (explicit "Attach to this Trip?", never automatic).
- **Booking Detail page has no Trip-attachment indicator or Detach action.** Verified: `BookingResponse`/`BookingHistoryResponse` never expose `travelerTripId`; the only existing path to learn a booking's Trip would be an N+1 scan of every accessible Trip's `getTripBusBookings` summary. **Classification: UNSUPPORTED without an inefficient scan — not implemented.** Attachment display/detach stays exclusively on the Trip's own tab, where `tripId` is already in scope.
- "Booked by [name]" resolves `bookedByUserId` against **both** `trip().organizer.userId` and the `members()` array (two separate model fields, not one unified list).

---

## Section H — Navigation, Architecture, Services, Routing State

### Routing
```
traveler.routes.ts (guarded, existing) — add:
  { path: 'bus-booking', loadChildren: () => import('.../bus-booking.routes').then(m => m.BUS_BOOKING_ROUTES) }

bus-booking.routes.ts:
  ''                     → MyBookings
  'new'                  → BookingFlow (standalone, no tripId)
  ':id'                  → BookingDetail
  'confirmation/:id'     → BookingConfirmation
  ':id/ticket'           → TicketDisplay (authenticated)

app.routes.ts (top-level, unguarded, sibling to role groups):
  'verify-ticket'        → TicketVerification (public)
```

### Guard / Interceptor
No new guard needed — the existing `authGuard` on the traveler shell covers every `bus-booking/*` child; `verify-ticket` has none, matching the backend's `permitAll`. The existing `authInterceptor` requires no change — it simply omits the bearer header when none exists, which is correct for the public verify page.

### Services
`features/bus-booking/services/` (flat, matching the `features/trips/services/` convention): `schedule.models.ts`/`schedule.service.ts` (moved out of `features/trips/services/`, corrected enums), `booking.models.ts`/`booking.service.ts` (create/list/detail/timeline/modify/cancel/partial-cancel/preview/ticket/verify), plus the Trip-attachment methods (`attachBookingToTrip`/`removeBookingFromTrip`/`getTripBusBookings`), imported cross-feature by the slimmed-down `trip-travel-tab.ts`.

### Navigation
`lucideBus` (already registered) added to `NAV_MAP.traveler` after "My Trips": `{ to: '/bus-booking', label: 'Bus Booking', icon: 'lucideBus' }`. A "New Booking" CTA follows the existing hardcoded-button pattern (as used for "New Trip").

### Shared component reuse & trip-context routing state
No stepper/wizard precedent exists anywhere in the app (confirmed by search) — `BookingFlow` is a new, single stateful component (internal step signal, not one route per step), reused both standalone (routed at `bus-booking/new`) and embedded directly (not routed) inside `trip-travel-tab.html` via an optional `tripId` input.

**Trip-context confirmation routing** (resolves how `BookingConfirmation` learns the originating Trip without relying on component memory surviving navigation, and without touching `BookingResponse`, which does not expose Trip context):
- On success, `BookingFlow` navigates via `router.navigate(['/bus-booking/confirmation', id], { queryParams: this.tripId() ? { tripId: this.tripId() } : {} })` — exactly the existing convention already used by `new-trip.ts` (`{ queryParams: { tab } }`).
- `BookingConfirmation` reads it back exactly as `trip-detail.ts` reads its `tab` param: `toSignal(this.route.queryParamMap.pipe(map(p => p.get('tripId'))), { initialValue: null })`.
- Standalone bookings never receive a `tripId` query param at all.
- This `tripId` is **UI context only, never proof of authorization** — the "Attach to this Trip?" action still calls the unmodified backend attach endpoint, which independently re-verifies Trip relationship, booking ownership, and Trip lifecycle from scratch. A stale/tampered query param can only cause that call to fail, never succeed improperly.
- No `localStorage`, no global booking-flow state service — a plain router query param.

---

## Deferred / explicitly out of scope
- The "can ACCEPTED members contribute their own bookings" question remains deferred, unanswered, unmodified.
- The `BookingController` RBAC gap (no `@PreAuthorize`, relying solely on `SecurityConfig`'s authenticated-catch-all) is documented, not fixed, in this frontend task.
- The cancellation-preview vs. actual-charge inconsistency (`FareRule` vs. `CancellationPolicy`) is documented, not fixed.
- Booking Detail Trip-attachment visibility is documented as unsupported by current contracts, not worked around with an N+1 scan.
