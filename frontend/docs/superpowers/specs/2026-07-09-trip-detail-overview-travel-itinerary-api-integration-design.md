# Trip Detail — Overview, Travel & Itinerary API Integration — Design

## Context

`trip-overview-tab`, `trip-travel-tab`, and `trip-itinerary-tab` (children of `trip-detail`) all
still render from `core/mock-data.ts`. `trip-detail.ts` itself also still looks up the trip from
the mock `trips` array rather than fetching it. This wires all of the above to the real backend,
reusing the loading/error/signal pattern already established in `trip-members-tab`.

Two data gaps were identified and deliberately scoped out rather than worked around with fake
data:

- The plain `/api/activities?destinationId=` catalog (used by both the Overview tab's
  "Recommended Activities" card and the Itinerary tab's "Available Activities" sidebar) has no
  price, rating, or image fields — those only exist in a separate, much larger "Activity
  Provider" marketplace (`ActivityProviderController`/`ActivityBookingController`/
  `TripActivityBookingController`) that is out of scope for this pass. Both cards drop
  price/rating/image and show name + duration only.
- There is no trip-timeline/events endpoint. The Overview tab's timeline is derived client-side
  from data already being fetched (see below); the "Hotel Selected" step is dropped entirely
  since no accommodation endpoint is wired this pass and a step that can never be marked done is
  misleading.

## Decisions

### Shared plumbing

**`TripsService` gains 2 methods**, same `ApiResponse<T>` unwrap pattern:

| Method | Endpoint |
|---|---|
| `getTripById(tripId: string): Observable<Trip>` | `GET /api/trips/{tripId}` |
| `getBudgetSummary(tripId: string): Observable<BudgetSummary>` | `GET /api/trips/{tripId}/budget/summary` |

**New `BudgetSummary` type** in `trip.models.ts`: `{ tripId, totalBudget, totalSpent,
remainingBudget, utilizationPercentage, overspent }` (member breakdown array omitted — not shown
anywhere in this UI), matching `BudgetSummaryResponse`.

**`trip-detail.ts` rewrite** — drops the mock `trips.find(...)` lookup. Injects `TripsService`,
fetches `getTripById(tripId)` in the constructor with the same loading/error signal pair as
`trip-members-tab`. `totalBudget`/`pct` are no longer computed client-side
(`budgetPerPerson * members`) — they come from `getBudgetSummary`. `TripResponse` has no
`image`/`area`/`currentCost`/`members`(count)/`budgetPerPerson`/`type` fields, so:
- Hero image becomes a static placeholder banner (same visual slot, no per-trip photo).
- "Area" text is dropped from the hero subtitle line.
- The "Leisure"-style type badge is replaced by a local `TRAVELER_CATEGORY_LABELS` constant
  (`{1:'Solo',2:'Couple',3:'Family',4:'Friends',5:'Corporate'}` — this mapping only exists as a
  code comment in `ActivityController`, no backend endpoint provides it) keyed by `trip.categoryId`.

**`DestinationsService`** (existing, reused unmodified) resolves `trip.destinationId` to a name
for the hero subtitle and to prefill the Travel tab's search form.

### Overview tab

- Stats row: Total Members (count from a members fetch), Trip Budget / Current Cost / Remaining
  (from `BudgetSummary`), Status (`trip.status`).
- Budget Meter: binds directly to `BudgetSummary` fields; no local arithmetic.
- Trip Timeline, each step computed from data already fetched for this tab:
  - **Created** — always done, dated `trip.createdAt`.
  - **Members Invited** — done if any member has `memberStatus === 'ACCEPTED'`.
  - **Bus Booked** — done if `GET /api/trips/{tripId}/bus-bookings` is non-empty.
  - *(Hotel Selected — removed from the steps this pass.)*
  - **Itinerary Finalized** — done if `GET /api/itinerary/progress?tripId=` reports 100%.
  - **Trip Begins** — done if today ≥ `trip.startDate`.
- Recommended Activities: `RecommendationsService.getRecommendations(trip.categoryId)` →
  `GET /api/recommendations?categoryId=`, filtered to `recommendationType === 'Activity'`, each
  `referenceId` cross-referenced against `ActivitiesService.getActivities(trip.destinationId)` to
  resolve a name/duration. Price/rating/image rows and the "Add" button's price display are
  dropped from the card per the catalog gap above; the "View all" button/card frame stays as-is.

### Travel tab (search + list only — booking flow deferred)

**New `ScheduleService`** (`features/trips/services`):

| Method | Endpoint |
|---|---|
| `searchBuses(source, destination, date): Observable<BusSearchResult[]>` | `GET /api/schedules/search` |
| `getTripBusBookings(tripId): Observable<TripBusBookingSummary>` | `GET /api/trips/{tripId}/bus-bookings` |

- Search form pre-fills `source` from `trip.sourceLocation`, `destination` from the resolved
  destination name, `date` from `trip.startDate` — all still editable. "Search" replaces the
  mock `buses` array with live `searchBuses` results in the same card layout.
- A second list, same card styling, sourced from `getTripBusBookings` shows buses already
  attached to this trip.
- The Seat Allocation card keeps its exact current layout (mock seat grid, warning banner,
  totals) but `View Seats`/`Select` become disabled no-ops — no schedule/seat-lock/booking/attach
  wiring this pass. This card and its buttons get revisited once seat locking + booking + attach
  are built.

### Itinerary tab (plain catalog only)

**New `ItineraryService`** (`features/trips/services`):

| Method | Endpoint |
|---|---|
| `list(tripId): Observable<ItineraryItem[]>` | `GET /api/itinerary?tripId=` |
| `create(request): Observable<ItineraryItem>` | `POST /api/itinerary` |
| `update(itineraryId, request): Observable<ItineraryItem>` | `PUT /api/itinerary/{itineraryId}` |
| `remove(itineraryId): Observable<void>` | `DELETE /api/itinerary/{itineraryId}` |
| `getProgress(tripId): Observable<ItineraryProgress>` | `GET /api/itinerary/progress?tripId=` |

**New `ActivitiesService`** (`features/trips/services` or `core`, shared with the Overview tab):
`getActivities(destinationId): Observable<Activity[]>` → `GET /api/activities?destinationId=`.

- Sidebar "Available Activities" renders `Activity[]` from `ActivitiesService` — name + duration
  only, no price/rating/image (same catalog gap as Overview).
- Clicking a sidebar "+" immediately calls `ItineraryService.create({ tripId, activityId,
  activityDate: trip.startDate, status: 'Pending' })` — no new date-picker UI this pass; the item
  lands on the trip's start date and can be corrected afterward via the update flow.
- Day-wise list: the backend returns a flat `ItineraryItem[]` (no day grouping, no day title).
  Grouped client-side by `activityDate`; day number computed as the date's offset from
  `trip.startDate` (`Day 1`, `Day 2`, ...); the descriptive title line ("Beach Day", "Departure")
  is replaced with the generic `"Day N"` — same visual slot, synthesized text.
- The current template has no mark-complete or delete controls (only the day-wise list and the
  sidebar "+"), so `ItineraryService.update`/`remove` are implemented on the service but not
  wired to any UI element this pass — nothing in the template regresses, and there's no unused
  button sitting dead in the UI.

## Testing

- `trips.service.spec.ts` gains cases for `getTripById` and `getBudgetSummary`.
- New `schedule.service.spec.ts`, `itinerary.service.spec.ts`, `activities.service.spec.ts`,
  `recommendations.service.spec.ts` — same `HttpTestingController` success/error pattern as
  `destinations.service.spec.ts`.
- `trip-detail.spec.ts` updated: stubs `TripsService.getTripById`, loading/error/populated states,
  category label mapping.
- `trip-overview-tab.spec.ts`, `trip-travel-tab.spec.ts`, `trip-itinerary-tab.spec.ts` rewritten
  to stub their respective services instead of importing mock data; cover loading/error/empty/
  populated states and the timeline-step derivation logic.

## Verification

- `ng build` and `ng test` succeed with no regressions.
- Manual, via curl against the running backend: fetch a real trip, confirm overview stats/budget
  meter/timeline reflect actual member/bus-booking/itinerary-progress state; search buses on the
  Travel tab against real routes; add an itinerary item via the sidebar and confirm it appears
  grouped under the right day.
