# Transport Provider Dashboard — Real Backend Integration

Status: Approved (Sections A–H), pending final spec review
Scope: `ROLE_PROVIDER` (Transport/Bus Provider) frontend only — Angular + Spartan UI + Tailwind
Out of scope: Traveler Trip/Invitation/Budget/Expense/Settlement/Itinerary/Bus Booking, Hotel (any), Activity (any), Admin frontend
Backend: **read-only** for this entire task. No endpoint, DTO, `@PreAuthorize`, or ownership-resolution logic changes.

## 1. Goal

Replace the dummy/mock Transport Provider dashboard (`frontend/src/app/features/transport/**`) with a fully functional UI wired to the existing Spring Boot `busbooking` backend, reusing the existing Angular/Spartan/Tailwind conventions already established elsewhere in the app (see `features/trips` as the reference pattern for signal-based loading/error/empty state).

## 2. Governing rule: tenant-scoping taxonomy

Every backend endpoint used by this feature was individually inspected (controller + service + DTO) and classified into exactly one of these categories. The frontend adapter for each endpoint must follow its proven category — never assume a scoping mechanism.

| Category | Meaning | Frontend behavior |
|---|---|---|
| **1 — Public free filter** | Endpoint has no `@PreAuthorize`/role restriction; an optional `providerId` query param is used as a plain WHERE filter with no identity check | Frontend must explicitly pass `StoredUser.providerId` to get an "own tenant" view. Omitting it returns all providers' data. Wrong value silently returns someone else's public data (no error). Applies to: `GET /api/buses` |
| **2 — Server-resolved (SecurityUtil)** | `securityUtil.resolveEffectiveProviderId(providerId)` forces/validates the value server-side | Frontend omits the param entirely. Applies to: `GET /operations/drivers`, `GET /operations/conductors`, `GET /operations/maintenance`, `GET /analytics/*` (dashboard, buses, routes, drivers, conductors, maintenance, bookings, revenue), `POST /reports/generate`, `POST /reports/export`, `GET /reports/history` |
| **3 — Fully internal, no param** | No provider-related param exists on the endpoint at all; scoping happens purely server-side (post-filter or join) | Frontend sends nothing. Applies to: `GET /operations/trips` (in-controller post-filter on `t.getProviderId()`) |
| **4 — Required path variable, backend-verified** | `providerId` is a required path segment AND the backend verifies it against the caller's identity (mismatch → rejected) | Frontend must supply `StoredUser.providerId` in the path — not a trust boundary, a structural requirement that's independently checked. Applies to: `GET /operations/fleet/availability/{providerId}` |
| **5 — DTO validation-before-overwrite quirk** | Request body field is `@NotNull` for Bean Validation but is unconditionally overwritten server-side before persistence/use | Frontend adapter injects an internal placeholder value (never shown in the form) purely to satisfy validation; documented as a backend contract limitation. Applies to: `BusRequest.providerId`, `DriverRequest.providerId`, `ConductorRequest.providerId` |
| **No providerId at all** | Entity has no provider field; scoping is entirely derived through an owned relation (e.g., `bus.providerId`) | Nothing to send, ever. Applies to: `Maintenance` (via `busId`), `BusSchedule`/`Trip` internals |
| **Backend limitation — no scoping mechanism exists** | Endpoint returns unfiltered data with no param, no role restriction, no server-side scoping | Frontend must apply a **client-side display filter** for UX only; this is explicitly NOT an authorization boundary. Applies to: `GET /api/schedules` (filter by `schedule.bus.providerId === StoredUser.providerId`) |

Category 2 is the default for nearly every provider-mutation endpoint (`POST/PUT` on Bus, Driver, Conductor, Schedule, Trip-assign/status, Maintenance, Reports) via `resolveEffectiveProviderId` or the controller's `assertOwns*` helpers (`assertOwnsBus`, `assertOwnsDriver`, `assertOwnsConductor`, `assertOwnsMaintenance`, `assertOwnsSchedule`, `assertOwnsTrip`). ROLE_ADMIN behavior always follows its own endpoint contract and must never be copied into the ROLE_PROVIDER UI.

## 3. Foundation

### 3.1 `StoredUser` / auth model

- `frontend/src/app/core/auth/auth.models.ts`: extend `StoredUser` with `providerId: number | null`.
- `frontend/src/app/core/auth/auth.service.ts`: persist `providerId` from `LoginResponse.user.providerId` (login) and `UserResponse.providerId` (`/api/auth/me`) into `te_user` localStorage + `userSignal`.
- **Never** use `StoredUser.providerId` as an authorization substitute — it is a display/read-filter convenience only (Category 1) or a required path segment (Category 4). Backend ownership assertions remain authoritative for every mutation.
- No provider selector anywhere in the ROLE_PROVIDER UI. No hardcoded providerId. No JWT decoding.

### 3.2 HTTP interceptor (`auth.interceptor.ts`)

- Keep existing Bearer-token attachment.
- Add **401-only** global handling: on a 401 response, clear token + stored user via `AuthService`, redirect to `/login`.
- **403 is not handled globally** — rethrow/preserve the `HttpErrorResponse` untouched. No global toast, no redirect. Callers (mutation methods) surface it via `ToastService`; read-only loaders surface it via the page's existing inline error state. This avoids duplicate error surfaces for the same 403.

### 3.3 `ToastService`

- New thin wrapper (`frontend/src/app/core/toast/toast.service.ts` or similar) around the existing Spartan Sonner primitive already vendored in `libs/ui`.
- API: `success(message: string)`, `error(message: string)`.
- `HlmToaster` mounted once in `AppShell`.
- Every mutation across all 7 Transport Provider pages goes through this service — no page calls Sonner directly. Covers: create/update success+failure, deactivate/cancel success+failure, lifecycle transition success+failure, report generation success+failure, export success+failure.

### 3.4 Loading/error/empty state

No new abstraction. Every page repeats the existing per-component signal pattern from `features/trips/components/trip-list` (loading skeleton → data → inline error banner with retry → empty-state message). Read-only 403s (where they can occur) render as the same inline error state, not a toast.

### 3.5 Route/nav structure (established now, filled in per phase)

`frontend/src/app/features/transport/transport.routes.ts` — full child list established during Foundation, each `loadComponent` pointing at its real component as that phase completes:

```
'' (Dashboard) | 'vehicles' (Vehicles + Maintenance tab) | 'staff' (NEW) | 'schedules' (renamed from 'routes') | 'trips' (NEW) | 'bookings' (Booking Analytics) | 'reports' (Reports & Analytics)
```

`app-shell.ts` `NAV_MAP.transport`:

```
{ to: '/transport',           label: 'Dashboard',           icon: 'lucideLayoutDashboard' }
{ to: '/transport/vehicles',  label: 'Vehicles',            icon: 'lucideBus' }
{ to: '/transport/staff',     label: 'Staff',                icon: 'lucideUsers' }
{ to: '/transport/schedules', label: 'Schedules',           icon: 'lucideCalendarClock' }
{ to: '/transport/trips',     label: 'Bus Trips',           icon: 'lucideNavigation' }
{ to: '/transport/bookings',  label: 'Booking Analytics',   icon: 'lucideChartLine' }
{ to: '/transport/reports',   label: 'Reports & Analytics', icon: 'lucideBarChart3' }
```

Only `/transport/routes` → `/transport/schedules` changes path (business meaning genuinely changed: Route is admin reference data, Schedule is the provider's own resource). All other paths are preserved.

## 4. Feature designs

### 4.1 Dashboard (`transport-dashboard`, unchanged path/component identity)

- `GET /api/analytics/dashboard` (Category 2, omit providerId) → `ProviderDashboardResponse`.
- Every dashboard card maps 1:1 to a proven response field (`KpiCard[]`, `ChartDataPoint[]` series, `FleetSummary`, `StaffSummary`, `MaintenanceSummary`, `TopRoute[]`). No dummy card is kept if it has no exact backend equivalent — removed rather than loosely remapped.
- Bus CRUD adapter note: `BusRequest.providerId` is Category 5 — internal placeholder injected by the adapter, never shown in the form; documented here as a DTO validation-contract limitation, not a design flaw to "fix."

### 4.2 Vehicles (`manage-vehicles`, unchanged path/component identity) + Maintenance tab (new)

- **Fleet tab**: `GET /api/buses?providerId=<StoredUser.providerId>` (Category 1 — public catalog, frontend read-filter only; not an authorization boundary). `POST /api/buses`, `PUT /api/buses/{id}`, `DELETE /api/buses/{id}` (soft delete) per exact `BusController` mappings — not assumed to all share one path shape.
- **Maintenance tab** (new, same page): `GET/POST/PUT /operations/maintenance`, `PATCH /operations/maintenance/{id}/status` (Category: no providerId at all — scoped via `bus.providerId` join).
  - `maintenanceType` is `String`, not an enum — combobox with suggested values (`OIL_CHANGE`, `TIRE_ROTATION`, `ENGINE_REPAIR`, etc.) plus free text.
  - Create: Bus (own fleet), Type, Description, Scheduled Date, Estimated Cost, Next Maintenance Date, Performed By. Surfaces the side effect: scheduling maintenance flips the bus to `MAINTENANCE` status.
  - Edit: same fields minus Bus (immutable); does **not** touch status/cost (`updateMaintenance` never sets them).
  - Status is a **formal, enforced transition graph** via `PATCH .../status`:
    `SCHEDULED→IN_PROGRESS→COMPLETED` (terminal), `SCHEDULED|IN_PROGRESS→CANCELLED` (terminal). Row actions show only the valid next action(s) for the current status; `COMPLETED`/`CANCELLED` show none. "Complete" collects `cost`+`completedDate`; "Cancel"/"Start" need no extra input.

### 4.3 Staff (`staff`, new page, tabs: Drivers / Conductors)

- `GET /operations/drivers`, `GET /operations/conductors` (Category 2, omit providerId). `POST/PUT` — `DriverRequest`/`ConductorRequest.providerId` is Category 5 (placeholder adapter).
- **Active field**: read-only badge, no toggle. No reactivation endpoint exists — `DELETE` (`deactivateDriver`/`deactivateConductor`) only ever sets `active=false` + `status=OFF_DUTY`; `PUT` never touches `active`. "Deactivate" row action disabled once already inactive (avoids a misleading no-op that would also silently reset status).
- **Form contract** (verified field-by-field against DTO + mapper + service):
  - Create: name, licenseNumber/employeeId, phone, email. Status is **not** shown on create — `toEntity()` never maps it; entity always defaults to `AVAILABLE` regardless of what's sent.
  - Edit: name, phone, email, status. licenseNumber/employeeId are **read-only on edit** — `updateDriver`/`updateConductor` never call their setters.
  - Never rendered as inputs: totalTrips, totalDistanceKm, rating, active, createdAt, id (response-only).
- **Status editing**: no formal transition graph exists for Driver/Conductor (`if (status != null && status != current) set(status)` — unconditional). Edit select lists all 5 enum values (`AVAILABLE, ASSIGNED, ON_TRIP, OFF_DUTY, LEAVE`) unrestricted; documented as an unrestricted set-by-value operation, not a state machine.

### 4.4 Schedules (`manage-schedules`, renamed from `manage-routes`, path `schedules`)

- Route is **admin-owned, read-only reference data** (`POST/PUT/DELETE /api/routes` are `hasRole('ADMIN')` only). Providers only ever read routes (`GET /api/routes?status=ACTIVE`) as a picker — no Route CRUD anywhere in this feature.
- `GET /api/schedules` — **Backend limitation: no scoping mechanism exists** (no providerId/status/busId param, no role restriction, returns every provider's schedules). Frontend fetches all and filters client-side by `schedule.bus.providerId === StoredUser.providerId`, explicitly documented as a UI display filter, not an authorization boundary (backend mutation ownership via `assertOwnsSchedule`/`assertOwnsBus` remains authoritative).
- Create: Bus (own `ACTIVE` buses only — `ensureAssignable` requires it), Route (admin's `ACTIVE` routes only, read-only display of source→destination/distance/duration), Travel Date, Departure Time, Arrival Time, Fare. No providerId field.
- Edit: same fields. Caution banner: **editing resets `availableSeats` to the bus's full `totalSeats`** (`updateSchedule` does this unconditionally, no lifecycle guard) — surfaced as-is, not corrected.
- Status (`SCHEDULED, DEPARTED, ARRIVED, CANCELLED`) is a **read-only badge** — no PATCH/transition endpoint exists for Schedule at all. The only mutating lifecycle action is **Cancel** (`DELETE` → sets `CANCELLED`), disabled once already `CANCELLED`. No "Mark Departed"/"Mark Arrived" — not invented, no backend support.
- Table columns: Route, Bus Number, Travel Date, Departure Time, Arrival Time, Fare, Available Seats, Status.

### 4.5 Bus Trips (`bus-trips`, new page, path `trips`)

Operational Trip (`busbooking.entity.Trip`) — distinct from Schedule (bookable inventory) and unrelated to the traveler-facing `itinerary`/`trip` domain (out of scope).

- `GET /operations/trips` — **Category 3, fully backend-scoped** (ROLE_PROVIDER post-filter happens server-side in the controller). No client-side filter needed here — deliberately the opposite situation from Schedules.
- Stat strip: `GET /operations/fleet/availability/{providerId}` (Category 4 — `StoredUser.providerId` required in path, backend-verified). Renders exactly the 8 `FleetAvailabilityResponse` fields: total/active/maintenance/inactive buses, available drivers/conductors, active/scheduled trip counts. Not a duplicate of the Dashboard — a distinct, real-time operational snapshot.
- **Assign Crew** (create, own Sheet on this page — not a Manage Schedules row action): `TripAssignmentRequest` — Schedule select (provider's own `SCHEDULED` schedules, reusing the Section 4.4 list), Driver select (own `AVAILABLE` drivers), Conductor select (own `AVAILABLE` conductors), Notes. Driver/Conductor stay optional (backend allows null for both). No frontend-invented "one Trip per Schedule" restriction — backend has no uniqueness constraint.
- **Lifecycle** — formal transition graph, confirmed directly from `transitionTrip`'s switch-statement conditions:

  | Status | Valid actions |
  |---|---|
  | SCHEDULED | Start Boarding, Cancel |
  | BOARDING | Mark Departed, Cancel |
  | DEPARTED | Mark Running, Mark Delayed, Cancel |
  | RUNNING | Mark Delayed, Mark Arrived, Cancel |
  | DELAYED | Mark Arrived, Cancel |
  | ARRIVED | Complete, Cancel |
  | COMPLETED | none (terminal) |
  | CANCELLED | none (terminal) |

  Cancel is valid from every non-terminal state, confirmed via `case CANCELLED: if (status == COMPLETED || status == CANCELLED) throw ...` — no `ARRIVED` exclusion. "Mark Delayed" collects `delayMinutes` only; "Complete" collects `distanceCoveredKm` only; "Cancel" collects an optional `reason`. No raw status selector anywhere.
- Table columns: Route/Travel Date (via schedule), Bus Number, Driver (optional), Conductor (optional), Status, Delay (when `DELAYED`), Actual Departure/Arrival (once populated).
- No GPS/map tracking, no ETA prediction, no passenger manifests — not backend-supported, not invented.

### 4.6 Booking Analytics (`booking-analytics`, renamed from `transport-bookings`, path `bookings` unchanged)

- **Backend limitation confirmed**: `GET /api/bookings` scopes by `userId == current caller` — a traveler's own booking history, never a provider view. **No endpoint exposes individual passenger booking records to ROLE_PROVIDER.** Classified explicitly as BACKEND ENDPOINT NOT AVAILABLE. The dummy passenger-list table, fake passenger names, fake booking references, and traveler-level row actions are all removed — not reskinned.
- Uses only: `GET /api/analytics/bookings` (`?from&to`, Category 2) → `BookingAnalyticsResponse` (totalBookings, confirmedBookings, cancelledBookings, cancellationRate, peakBookingHours, peakTravelDays, bookingGrowth, bookingStatusDistribution — all `ChartDataPoint[]`) and `GET /api/analytics/revenue` (`?from&to`) → `RevenueAnalyticsResponse` (daily/weekly/monthly/total/range revenue, revenueGrowthPercent, averageBookingValue, averageFare, coupon usage/discount, daily/weekly/monthly revenue trend charts).
- One shared date-range control drives both calls (identical `from`/`to` contract on both endpoints).
- Uses the already-installed ECharts + `echart-theme` — no second chart library.

### 4.7 Reports & Analytics (`transport-reports`, expanded in place, path `reports` unchanged)

Two tabs: **Performance Analytics** and **Report Center**.

**Performance Analytics** — four resource views, each rendering only proven response fields, no invented scores:
- Bus (`/analytics/buses`): busNumber, busName, utilizationPercentage, occupancyPercentage, revenue, tripCount, bookingCount, seatsSold, performanceCategory (badge).
- Route (`/analytics/routes`): source→destination, revenue, bookingCount, passengerCount, occupancyPercentage, distanceKm, revenuePerKm, performanceCategory (badge).
- Driver (`/analytics/drivers`): driverName, licenseNumber, totalTrips, completedTrips, distanceCovered, rating, utilizationPercentage, performanceCategory (badge).
- Conductor (`/analytics/conductors`): conductorName, employeeId, totalTrips, completedTrips, passengerHandling, rating, performanceCategory (badge).
- Maintenance summary card (`/analytics/maintenance`): totalMaintenanceCost, averageCostPerBus, maintenanceCount, totalDowntimeDays, averageDowntimePerBus, maintenanceFrequencyPerMonth, upcomingMaintenance list. Does **not** duplicate the Fleet page's Maintenance management table — this is analytics-only, management stays on the Vehicles page.
- **Dead-field note**: `/analytics/buses`, `/routes`, `/drivers`, `/conductors` each accept `sort`/`size` query params, but the controller only ever forwards `effectiveProviderId` to the service method (`analyticsService.getBusAnalytics(effectiveProviderId)` — single argument; `sort`/`size` are read and discarded). No sort/page-size control is built against these four endpoints expecting server-side effect — any client-side sorting is done in the frontend over the full returned array, same treatment as the Report Center's client-side pagination.

**Report Center** — filter UI is built **dynamically per `ReportType`**, driven by the exact field-consumption proof from `ReportServiceImpl`'s 11 branches (not by displaying every filter for every type):

| ReportType | Filters shown | bookingStatus behavior |
|---|---|---|
| BOOKING | Date range, Bus, Route | optional, full `BookingStatus` enum (unrestricted) |
| REVENUE | Date range, Bus, Route | optional, `{CONFIRMED, COMPLETED}` only; omitted = backend default (both) |
| PASSENGER | Date range, Bus, Route | optional, `{CONFIRMED, COMPLETED}` only; omitted = backend default |
| CANCELLATION | Date range, Bus, Route | **no selector** — `CANCELLED` applied automatically (backend rejects anything else) |
| BUS_PERFORMANCE | none | n/a |
| ROUTE_PERFORMANCE | none | n/a |
| DRIVER_PERFORMANCE | none | n/a |
| CONDUCTOR_PERFORMANCE | none | n/a |
| FLEET_UTILIZATION | none | n/a |
| MAINTENANCE | Bus only | n/a |
| REFUND | none | n/a |

`driverId`/`conductorId` are **never** shown for any report type — proven dead fields across all 11 branches. Resource-ID filters (busId/routeId) only appear where the table above proves the branch actually reads them (e.g. `ROUTE_PERFORMANCE` ignores `routeId` entirely despite the name).

- **Generate** (`POST /reports/generate`): renders `ReportResponse` summary + a dynamic table from `data: List<Map<String,Object>>` — columns derived from the union of keys across the whole returned array (not just row 0), stable order, safe missing-key handling, monetary/date formatting only where the field's proven meaning warrants it. **Pagination is client-side only** over the full returned array — `ReportResponse.page/size/totalPages` are computed from unused input values and never actually slice the data (confirmed: no `.skip()/.limit()` anywhere in any branch), so they are never treated as authoritative. `generatedBy` is displayed exactly as returned (`"SYSTEM"`, hardcoded backend-side) — never synthesized as the current user's name.
- **Export** (`POST /reports/export`): exactly two format options, `CSV` and `EXCEL` (mapped to the backend's proven `.csv`/`.xlsx` content-type/filename behavior) — no other format strings exposed even though the backend falls back to CSV for unrecognized values. `ReportExportRequest` has **no `bookingStatus` field** — the Export filter form is Bus/Route/date-range only, even where Generate exposes a status control for the same report type. This asymmetry between Generate and Export is real and is represented truthfully, not smoothed over.
- **Report History** (`GET /reports/history`): read-only audit log (reportName, reportType, generatedAt, generatedBy, appliedFilters as a plain string, exportFormat, recordCount). No "Download Again"/"Re-export"/"Open File" — no stored-file-retrieval endpoint exists.

## 5. Visual design constraint (all pages)

The existing Transport Partner frontend source is the authoritative design reference. Extend, do not redesign: same sidebar/header/page-title hierarchy, same light content background, rounded white cards with existing border/shadow treatment, same typography/spacing/icon treatment, same chart visual direction via the existing `echart-theme`. Spartan UI (`Tabs`, `Table`, `Sheet`, `AlertDialog`, `Sonner`) are implementation primitives within this existing language, not a new design system. No generic BI-dashboard template, no glassmorphism/neon/separate dark shell.

## 6. Known backend contract limitations (final list)

1. `GET /api/schedules` has no server-side provider scoping at all — frontend applies a client-side display filter (Section 4.4).
2. `GET /api/bookings` cannot serve as a provider booking list — no passenger-level visibility exists for ROLE_PROVIDER (Section 4.6).
3. `driverId`/`conductorId` on `ReportFilterRequest` are accepted by validation but consumed by zero report branches (Section 4.7).
4. `ReportResponse.page/size/totalPages` do not reflect real server-side slicing — always the full result set (Section 4.7).
5. `generatedBy` is hardcoded `"SYSTEM"` server-side, never the actual caller (Section 4.7).
6. `ReportExportRequest` lacks a `bookingStatus` field, creating a real Generate/Export filter asymmetry (Section 4.7).
7. `BusRequest`/`DriverRequest`/`ConductorRequest.providerId` are `@NotNull` but always server-overwritten (Category 5, Sections 4.1/4.3).
8. `updateSchedule` resets `availableSeats` to full capacity on every edit, with no lifecycle guard (Section 4.4).
9. Driver/Conductor have no formal status transition graph (any value accepted); Maintenance and Trip do (Sections 4.2/4.3/4.5).
10. No reactivation endpoint exists for Driver/Conductor once deactivated (Section 4.3).
11. `sort`/`size` query params on `/analytics/buses`, `/routes`, `/drivers`, `/conductors` are accepted but never forwarded to the service layer — dead server-side (Section 4.7).

None of these are fixed or worked around in the backend — all are surfaced faithfully in the frontend per the read-only constraint.

## 7. Implementation phases

1. **Foundation** — `StoredUser.providerId`, exact API models/services for every endpoint above, `ToastService` + `HlmToaster` in `AppShell`, 401-only interceptor handling, full approved route/nav structure (Section 3.5) wired with placeholder/real components as each phase lands.
2. **Dashboard**
3. **Vehicles + Maintenance tab**
4. **Staff**
5. **Schedules**
6. **Bus Trips**
7. **Booking Analytics**
8. **Reports & Analytics**
9. **Cleanup** — remove replaced mock-data usage, fake passenger rows, obsolete Manage Routes provider UI, dead imports/components (only when proven unused). Do not touch mock data still used by other role workspaces (traveler/hotel/activity/admin). Do not refactor unrelated features.
10. **Validation pass** (Section 8)

## 8. Validation matrix (final pass)

- `ng build` clean; no unused-import/dead-code lint failures introduced.
- Live runtime: login as seeded `ROLE_PROVIDER` (transport), walk every page — Dashboard, Vehicles(+Maintenance), Staff, Schedules, Bus Trips, Booking Analytics, Reports & Analytics.
- 401: expired/invalid token → forced logout + redirect, confirmed via interceptor.
- 403: attempt a cross-provider mutation (e.g., edit another provider's bus/driver/schedule/trip via crafted ID) → inline error or toast per read-vs-mutation path, **no** forced logout.
- Cross-provider isolation: confirm Schedules client-side filter and Bus read-filter both correctly show only the authenticated provider's own data; confirm Trips list needs no such filter (already server-scoped).
- Role denial: `ROLE_TRAVELER`/`ROLE_HOTEL_PROVIDER`/`ROLE_ACTIVITY_PROVIDER`/`ROLE_ADMIN` tokens against the transport route guard and against representative endpoints.
- Every lifecycle action (Maintenance, Trip, Schedule cancel, Driver/Conductor deactivate) exercised end-to-end against the real H2-backed runtime, confirming UI-exposed actions exactly match the verified transition graphs.
- Report Center: generate + export for at least one report type per filter-shown/filter-hidden category; confirm CSV and EXCEL downloads both succeed with correct content type.
