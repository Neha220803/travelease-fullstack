# Transport Provider Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dummy/mock Transport Provider (ROLE_PROVIDER, transport/bus only) dashboard in the existing Angular frontend with a fully functional UI wired to the existing Spring Boot `busbooking` backend.

**Architecture:** Extend the existing `frontend/src/app/features/transport/**` feature module in place — add per-feature `*.models.ts`/`*.service.ts` pairs (mirroring `features/trips/services/trips.service.ts`), rewrite each dummy component to call real HTTP services, wire new/renamed routes and nav entries incrementally per phase.

**Tech Stack:** Angular 21 standalone components, Angular signals, Spartan UI (`@spartan-ng/helm/*`), Tailwind CSS 4, ECharts 6 via existing `EChart` wrapper, Vitest + `TestBed` + `HttpTestingController`.

## Global Constraints

- Authoritative spec: `docs/superpowers/specs/2026-07-09-transport-provider-dashboard-design.md`. Do not reopen Sections A-H unless current source code directly contradicts a locked assumption.
- Backend is **read-only**: no endpoint/path/method/DTO/`@PreAuthorize`/ownership-resolution change, ever.
- `ROLE_PROVIDER` = Transport Provider only. No Hotel/Activity Provider or Admin frontend work.
- Existing frontend source is the authoritative visual design reference. Extend, do not redesign.
- No invented endpoints. No fake/mock Transport Provider business data survives after integration. No passenger-level provider booking table.
- Every `providerId` use follows the endpoint-specific tenant-scoping category from the spec (Section 2) — never assumed.
- 401 is handled globally by `authInterceptor` (logout + redirect). 403 is never handled globally — components/services surface it via `ToastService` (mutations) or the existing inline error state (reads).
- `ToastService` is the only Sonner wrapper; no page calls `toast`/Sonner directly.
- No generic loading/error/empty-state abstraction — repeat the existing per-component signal pattern (`features/trips/components/trip-list` is the reference).
- Report filters follow the exact `ReportServiceImpl` branch-consumption matrix (spec Section 4.7). Report pagination is frontend-only. Export supports only `CSV`/`EXCEL`.
- No unsupported schedule/trip lifecycle actions, no reactivation actions, no frontend authorization assumptions replacing backend enforcement.
- Git safety: no `git add`/`commit`/`push`/`reset`/`restore`/`revert` at any point in this plan. Steps below include `git add`/`git commit` commands per the writing-plans template convention — **do not run them**; leave all changes uncommitted until the user explicitly instructs otherwise.

---

## Phase 1: Foundation

### Task 1: `StoredUser.providerId` capture and persistence

**Files:**
- Modify: `frontend/src/app/core/auth/auth.models.ts`
- Modify: `frontend/src/app/core/auth/auth.service.ts:44-50`
- Modify: `frontend/src/app/core/auth/auth.service.spec.ts` (existing "logs in" test's `toEqual` assertion)

**Interfaces:**
- Consumes: nothing new — `LoginResponseDto.user.providerId` already exists in `auth.service.ts:20`.
- Produces: `StoredUser.providerId: number | null`, readable everywhere via `authService.currentUser()?.providerId`.

Current state (already inspected): `LoginResponseDto` already declares `providerId: number | null` on the DTO, but `StoredUser` (models) doesn't have the field and the `login()` mapping (`auth.service.ts:45-50`) drops it when building the returned/persisted user object. This is the only gap.

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/app/core/auth/auth.service.spec.ts`, inside the existing `describe('AuthService', ...)` block, a new test:

```typescript
  it('captures providerId from the login response for a transport provider', async () => {
    const { service, httpMock } = await setup();

    const loginPromise = service.login('provider1@travelease.test', 'password123');

    const req = httpMock.expectOne('http://localhost:8080/api/auth/login');
    req.flush({
      success: true,
      data: {
        accessToken: 'jwt-token',
        user: {
          id: 'u2',
          name: 'Provider One',
          email: 'provider1@travelease.test',
          phone: '9000000001',
          role: 'ROLE_PROVIDER',
          providerId: 101,
        },
      },
      message: 'Login successful',
      error: null,
    });

    const user = await loginPromise;
    expect(user.providerId).toBe(101);
    expect(service.currentUser()?.providerId).toBe(101);
  });
```

Also update the pre-existing test `'logs in, maps the backend role, and persists the session'` in the same file: its final assertion currently reads
```typescript
expect(user).toEqual({ id: 'u1', name: 'Admin User', email: 'admin@travelease.test', role: 'admin' });
```
change it to:
```typescript
expect(user).toEqual({ id: 'u1', name: 'Admin User', email: 'admin@travelease.test', role: 'admin', providerId: null });
```
(the mocked `req.flush` in that test already sends `providerId: null` — only the assertion needs updating).

- [ ] **Step 2: Run tests to verify the new test fails and the old one now needs the fix above**

Run: `cd frontend && npx vitest run src/app/core/auth/auth.service.spec.ts`
Expected: the new `'captures providerId...'` test FAILs with `expected undefined to be 101` (or similar) since `StoredUser` has no `providerId` field yet and `login()` doesn't map it.

- [ ] **Step 3: Implement — add the field to `StoredUser`**

In `frontend/src/app/core/auth/auth.models.ts`, change:
```typescript
export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}
```
to:
```typescript
export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  providerId: number | null;
}
```

- [ ] **Step 4: Implement — map `providerId` in `login()`**

In `frontend/src/app/core/auth/auth.service.ts`, change the `user` construction (currently lines 45-50):
```typescript
    const user: StoredUser = {
      id: response.data.user.id,
      name: response.data.user.name,
      email: response.data.user.email,
      role,
    };
```
to:
```typescript
    const user: StoredUser = {
      id: response.data.user.id,
      name: response.data.user.name,
      email: response.data.user.email,
      role,
      providerId: response.data.user.providerId,
    };
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/app/core/auth/auth.service.spec.ts`
Expected: PASS, all tests including the two touched above.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/core/auth/auth.models.ts frontend/src/app/core/auth/auth.service.ts frontend/src/app/core/auth/auth.service.spec.ts
git commit -m "feat(auth): persist providerId on StoredUser from login response"
```

---

### Task 2: `ToastService` (Sonner wrapper) + mount `HlmToaster`

**Files:**
- Create: `frontend/src/app/core/toast/toast.service.ts`
- Create: `frontend/src/app/core/toast/toast.service.spec.ts`
- Modify: `frontend/src/app/shared/layout/app-shell/app-shell.ts`
- Modify: `frontend/src/app/shared/layout/app-shell/app-shell.html`

**Interfaces:**
- Consumes: `toast` from `@spartan-ng/brain/sonner` (confirmed exports: `toast(message)`, `toast.success(message)`, `toast.error(message)`).
- Produces: `ToastService.success(message: string): void`, `ToastService.error(message: string): void` — every later mutation task in this plan injects this service; no other task calls Sonner/`toast` directly.

Confirmed from `node_modules/@spartan-ng/brain/types/spartan-ng-brain-sonner.d.ts`: `toast.success`/`toast.error` are plain functions on a module-level singleton, not DI-injectable — `ToastService` exists purely to give the app one indirection point and one import site.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/core/toast/toast.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { toast } from '@spartan-ng/brain/sonner';
import { ToastService } from '@app/core/toast/toast.service';

vi.mock('@spartan-ng/brain/sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

describe('ToastService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates success() to sonner toast.success', () => {
    const service = TestBed.inject(ToastService);
    service.success('Bus created successfully');
    expect(toast.success).toHaveBeenCalledWith('Bus created successfully');
  });

  it('delegates error() to sonner toast.error', () => {
    const service = TestBed.inject(ToastService);
    service.error('Failed to save schedule');
    expect(toast.error).toHaveBeenCalledWith('Failed to save schedule');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/app/core/toast/toast.service.spec.ts`
Expected: FAIL — `Cannot find module '@app/core/toast/toast.service'`.

- [ ] **Step 3: Implement `ToastService`**

Create `frontend/src/app/core/toast/toast.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';

@Injectable({ providedIn: 'root' })
export class ToastService {
  success(message: string): void {
    toast.success(message);
  }

  error(message: string): void {
    toast.error(message);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/app/core/toast/toast.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Mount `HlmToaster` once in `AppShell`**

In `frontend/src/app/shared/layout/app-shell/app-shell.ts`, add the import and register it on the component:
```typescript
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
```
add `HlmToasterImports` to the `imports: [...]` array in the `@Component` decorator (alongside `HlmButtonImports`, `HlmInputImports`, `HlmAvatarImports`).

In `frontend/src/app/shared/layout/app-shell/app-shell.html`, add near the end of the root template (sibling to the existing `<router-outlet />`, outside any layout-shifting container):
```html
<hlm-toaster richColors closeButton />
```

- [ ] **Step 6: Run the full app-shell spec to confirm no regression**

Run: `cd frontend && npx vitest run src/app/shared/layout/app-shell/app-shell.spec.ts`
Expected: PASS (existing tests unaffected — `HlmToaster` renders unconditionally and has no inputs required).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/core/toast/toast.service.ts frontend/src/app/core/toast/toast.service.spec.ts frontend/src/app/shared/layout/app-shell/app-shell.ts frontend/src/app/shared/layout/app-shell/app-shell.html
git commit -m "feat(toast): add ToastService wrapper around Spartan Sonner and mount HlmToaster"
```

---

### Task 3: 401-only global interceptor handling (403 passthrough)

**Files:**
- Modify: `frontend/src/app/core/auth/auth.interceptor.ts`
- Modify: `frontend/src/app/core/auth/auth.interceptor.spec.ts`

**Interfaces:**
- Consumes: `AuthService.logout()` (already exists, `auth.service.ts:56-63`), Angular `Router` (via `inject(Router)`).
- Produces: the interceptor now catches errors; no new public method — later phases just rely on 403s reaching their own `catchError`/`error` callback unmodified.

Current state (already inspected): `auth.interceptor.ts` only attaches the Bearer token via `req.clone(...)`, no response handling at all.

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/app/core/auth/auth.interceptor.spec.ts`, inside `describe('authInterceptor', ...)`, two new tests (each configures its own `TestBed` with a mock `Router`):

```typescript
  it('on 401: logs out and redirects to /login', async () => {
    const logout = vi.fn();
    const navigate = vi.fn().mockResolvedValue(true);
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getToken: () => 'jwt-token', logout } },
        { provide: Router, useValue: { navigate } },
      ],
    }).compileComponents();
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);

    http.get('/api/whatever').subscribe({ error: () => {} });
    const req = httpMock.expectOne('/api/whatever');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('on 403: does not log out or redirect, and rethrows the error', async () => {
    const logout = vi.fn();
    const navigate = vi.fn().mockResolvedValue(true);
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getToken: () => 'jwt-token', logout } },
        { provide: Router, useValue: { navigate } },
      ],
    }).compileComponents();
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);

    let caughtStatus: number | undefined;
    http.get('/api/whatever').subscribe({ error: (err) => (caughtStatus = err.status) });
    const req = httpMock.expectOne('/api/whatever');
    req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(caughtStatus).toBe(403);
  });
```

Add the two new imports at the top of the file: `import { Router } from '@angular/router';` and `import { AuthService } from '@app/core/auth/auth.service';` (the latter likely already imported).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/app/core/auth/auth.interceptor.spec.ts`
Expected: the two new tests FAIL — `logout`/`navigate` never called since the interceptor has no error handling yet.

- [ ] **Step 3: Implement**

Replace the full contents of `frontend/src/app/core/auth/auth.interceptor.ts`:

```typescript
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '@app/core/auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();
  const authedReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        authService.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/app/core/auth/auth.interceptor.spec.ts`
Expected: PASS, all 4 tests (2 pre-existing token-attachment tests + 2 new ones).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/core/auth/auth.interceptor.ts frontend/src/app/core/auth/auth.interceptor.spec.ts
git commit -m "feat(auth): handle 401 globally in interceptor, pass 403 through untouched"
```

---

### Task 4: Shared Transport backend-enum constants module

**Files:**
- Create: `frontend/src/app/features/transport/services/transport-enums.ts`
- Create: `frontend/src/app/features/transport/services/transport-enums.spec.ts`

**Interfaces:**
- Consumes: nothing (pure constants module).
- Produces: TS union types + display-order arrays for every backend enum this feature touches, imported by every later phase's models/components: `DriverStatus`, `ConductorStatus`, `MaintenanceStatus`, `BusStatus`, `ScheduleStatus`, `TripStatus`, `RouteStatus`, `BookingStatus`, `ReportType`.

Exact enum values, confirmed by reading each backend `entity/enums/*.java` file directly during design:
- `DriverStatus`/`ConductorStatus`: `AVAILABLE | ASSIGNED | ON_TRIP | OFF_DUTY | LEAVE`
- `MaintenanceStatus`: `SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED`
- `BusStatus`: `ACTIVE | INACTIVE | MAINTENANCE`
- `ScheduleStatus`: `SCHEDULED | DEPARTED | ARRIVED | CANCELLED`
- `TripStatus`: `SCHEDULED | BOARDING | DEPARTED | RUNNING | DELAYED | ARRIVED | COMPLETED | CANCELLED`
- `RouteStatus`: `ACTIVE | INACTIVE`
- `BookingStatus`: `PENDING | RESERVED | CONFIRMED | FAILED | CANCELLED | COMPLETED | EXPIRED`
- `ReportType`: `BOOKING | REVENUE | PASSENGER | BUS_PERFORMANCE | ROUTE_PERFORMANCE | DRIVER_PERFORMANCE | CONDUCTOR_PERFORMANCE | FLEET_UTILIZATION | MAINTENANCE | REFUND | CANCELLATION`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/features/transport/services/transport-enums.spec.ts`:

```typescript
import { DRIVER_STATUSES, REPORT_TYPES, TRIP_STATUSES } from '@app/features/transport/services/transport-enums';

describe('transport-enums', () => {
  it('lists exactly the 5 backend DriverStatus values in enum declaration order', () => {
    expect(DRIVER_STATUSES).toEqual(['AVAILABLE', 'ASSIGNED', 'ON_TRIP', 'OFF_DUTY', 'LEAVE']);
  });

  it('lists exactly the 8 backend TripStatus values in enum declaration order', () => {
    expect(TRIP_STATUSES).toEqual([
      'SCHEDULED', 'BOARDING', 'DEPARTED', 'RUNNING', 'DELAYED', 'ARRIVED', 'COMPLETED', 'CANCELLED',
    ]);
  });

  it('lists exactly the 11 backend ReportType values in enum declaration order', () => {
    expect(REPORT_TYPES).toEqual([
      'BOOKING', 'REVENUE', 'PASSENGER', 'BUS_PERFORMANCE', 'ROUTE_PERFORMANCE',
      'DRIVER_PERFORMANCE', 'CONDUCTOR_PERFORMANCE', 'FLEET_UTILIZATION', 'MAINTENANCE', 'REFUND', 'CANCELLATION',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/app/features/transport/services/transport-enums.spec.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

Create `frontend/src/app/features/transport/services/transport-enums.ts`:

```typescript
export type DriverStatus = 'AVAILABLE' | 'ASSIGNED' | 'ON_TRIP' | 'OFF_DUTY' | 'LEAVE';
export const DRIVER_STATUSES: DriverStatus[] = ['AVAILABLE', 'ASSIGNED', 'ON_TRIP', 'OFF_DUTY', 'LEAVE'];

export type ConductorStatus = DriverStatus;
export const CONDUCTOR_STATUSES: ConductorStatus[] = DRIVER_STATUSES;

export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export const MAINTENANCE_STATUSES: MaintenanceStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export type BusStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export const BUS_STATUSES: BusStatus[] = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'];

export type ScheduleStatus = 'SCHEDULED' | 'DEPARTED' | 'ARRIVED' | 'CANCELLED';
export const SCHEDULE_STATUSES: ScheduleStatus[] = ['SCHEDULED', 'DEPARTED', 'ARRIVED', 'CANCELLED'];

export type TripStatus =
  | 'SCHEDULED' | 'BOARDING' | 'DEPARTED' | 'RUNNING' | 'DELAYED' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED';
export const TRIP_STATUSES: TripStatus[] = [
  'SCHEDULED', 'BOARDING', 'DEPARTED', 'RUNNING', 'DELAYED', 'ARRIVED', 'COMPLETED', 'CANCELLED',
];

export type RouteStatus = 'ACTIVE' | 'INACTIVE';
export const ROUTE_STATUSES: RouteStatus[] = ['ACTIVE', 'INACTIVE'];

export type BookingStatus = 'PENDING' | 'RESERVED' | 'CONFIRMED' | 'FAILED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
export const BOOKING_STATUSES: BookingStatus[] = [
  'PENDING', 'RESERVED', 'CONFIRMED', 'FAILED', 'CANCELLED', 'COMPLETED', 'EXPIRED',
];

export type ReportType =
  | 'BOOKING' | 'REVENUE' | 'PASSENGER' | 'BUS_PERFORMANCE' | 'ROUTE_PERFORMANCE'
  | 'DRIVER_PERFORMANCE' | 'CONDUCTOR_PERFORMANCE' | 'FLEET_UTILIZATION' | 'MAINTENANCE' | 'REFUND' | 'CANCELLATION';
export const REPORT_TYPES: ReportType[] = [
  'BOOKING', 'REVENUE', 'PASSENGER', 'BUS_PERFORMANCE', 'ROUTE_PERFORMANCE',
  'DRIVER_PERFORMANCE', 'CONDUCTOR_PERFORMANCE', 'FLEET_UTILIZATION', 'MAINTENANCE', 'REFUND', 'CANCELLATION',
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/app/features/transport/services/transport-enums.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/transport/services/transport-enums.ts frontend/src/app/features/transport/services/transport-enums.spec.ts
git commit -m "feat(transport): add shared backend-enum constants for Transport Provider feature"
```

**Phase 1 exit check:** `cd frontend && npx vitest run src/app/core/auth src/app/core/toast src/app/features/transport/services/transport-enums.spec.ts` — all green. `cd frontend && npx ng build` — no new compile errors (existing dummy transport components still reference old mock data untouched; this phase does not touch them).

---

## Phase 2: Dashboard

### Task 5: Dashboard models + service

**Files:**
- Create: `frontend/src/app/features/transport/services/dashboard.models.ts`
- Create: `frontend/src/app/features/transport/services/dashboard.service.ts`
- Create: `frontend/src/app/features/transport/services/dashboard.service.spec.ts`
- Inspect before editing: `frontend/src/app/features/trips/services/trips.service.ts` (HTTP service pattern), `frontend/src/app/core/api/api-config.ts` (`API_BASE_URL`), `frontend/src/app/core/api/api-response.model.ts` (`ApiResponse<T>`).

**Backend endpoint:** `GET /api/analytics/dashboard`
**Tenant scoping:** Category 2 (server-resolved via `SecurityUtil.resolveEffectiveProviderId`) — frontend omits `providerId` entirely.
**Response DTO** (`ProviderDashboardResponse`, fields confirmed by direct read of the backend source):

```java
providerId: Long
todayBookings, todayRevenue, weeklyRevenue, monthlyRevenue, totalRevenue,
activeTrips, runningTrips, completedTrips, cancelledTrips, delayedTrips,
totalPassengers, fleetAvailability: KpiCard   // 12 cards total
revenueTrend, bookingTrend, tripStatusDistribution: List<ChartDataPoint>
fleetSummary: { totalBuses, activeBuses, maintenanceBuses: Long }
staffSummary: { activeDrivers, activeConductors: Long }
maintenanceSummary: { upcomingCount: Long, nextItems: List<{ maintenanceId, busId: Long, busNumber, maintenanceType: String, scheduledDate: LocalDate }> }
topRoutes: List<{ routeId: Long, source, destination: String, bookingCount: Long, revenue: Double }>
```
`KpiCard`: `{ title: String, value: Double, unit: String, changePercent: Double, trend: String (UP/DOWN/STABLE), icon: String }`
`ChartDataPoint`: `{ label: String, value: Double, category: String, color: String }`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/features/transport/services/dashboard.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardService } from '@app/features/transport/services/dashboard.service';
import { ProviderDashboardResponse } from '@app/features/transport/services/dashboard.models';

const DASHBOARD_RESPONSE: ProviderDashboardResponse = {
  providerId: 101,
  todayBookings: { title: 'Today Bookings', value: 12, unit: 'bookings', changePercent: 5, trend: 'UP', icon: 'ticket' },
  todayRevenue: { title: 'Today Revenue', value: 24000, unit: 'INR', changePercent: 3, trend: 'UP', icon: 'wallet' },
  weeklyRevenue: { title: 'Weekly Revenue', value: 168000, unit: 'INR', changePercent: 2, trend: 'STABLE', icon: 'wallet' },
  monthlyRevenue: { title: 'Monthly Revenue', value: 720000, unit: 'INR', changePercent: 8, trend: 'UP', icon: 'wallet' },
  totalRevenue: { title: 'Total Revenue', value: 4200000, unit: 'INR', changePercent: 0, trend: 'STABLE', icon: 'wallet' },
  activeTrips: { title: 'Active Trips', value: 4, unit: 'trips', changePercent: 0, trend: 'STABLE', icon: 'bus' },
  runningTrips: { title: 'Running Trips', value: 2, unit: 'trips', changePercent: 0, trend: 'STABLE', icon: 'bus' },
  completedTrips: { title: 'Completed Trips', value: 186, unit: 'trips', changePercent: 4, trend: 'UP', icon: 'check' },
  cancelledTrips: { title: 'Cancelled Trips', value: 3, unit: 'trips', changePercent: -1, trend: 'DOWN', icon: 'x' },
  delayedTrips: { title: 'Delayed Trips', value: 1, unit: 'trips', changePercent: 0, trend: 'STABLE', icon: 'clock' },
  totalPassengers: { title: 'Total Passengers', value: 1284, unit: 'passengers', changePercent: 6, trend: 'UP', icon: 'users' },
  fleetAvailability: { title: 'Fleet Availability', value: 82, unit: '%', changePercent: 0, trend: 'STABLE', icon: 'bus' },
  revenueTrend: [{ label: 'Mon', value: 10000, category: 'revenue', color: null }],
  bookingTrend: [{ label: 'Mon', value: 5, category: 'bookings', color: null }],
  tripStatusDistribution: [{ label: 'RUNNING', value: 2, category: 'status', color: null }],
  fleetSummary: { totalBuses: 8, activeBuses: 6, maintenanceBuses: 2 },
  staffSummary: { activeDrivers: 5, activeConductors: 5 },
  maintenanceSummary: { upcomingCount: 2, nextItems: [] },
  topRoutes: [{ routeId: 1, source: 'Bengaluru', destination: 'Goa', bookingCount: 40, revenue: 300000 }],
};

describe('DashboardService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return {
      service: TestBed.inject(DashboardService),
      httpMock: TestBed.inject(HttpTestingController),
    };
  }

  it('fetches the provider dashboard without a providerId query param', async () => {
    const { service, httpMock } = await setup();

    const promise = service.getDashboard();
    const req = httpMock.expectOne('http://localhost:8080/api/analytics/dashboard');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('providerId')).toBe(false);
    req.flush({ success: true, data: DASHBOARD_RESPONSE, message: null, error: null });

    expect(await promise).toEqual(DASHBOARD_RESPONSE);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/app/features/transport/services/dashboard.service.spec.ts`
Expected: FAIL — `dashboard.service`/`dashboard.models` do not exist.

- [ ] **Step 3: Implement models**

Create `frontend/src/app/features/transport/services/dashboard.models.ts`:

```typescript
export interface KpiCard {
  title: string;
  value: number;
  unit: string;
  changePercent: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  icon: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  category: string;
  color: string | null;
}

export interface UpcomingMaintenanceItem {
  maintenanceId: number;
  busId: number;
  busNumber: string;
  maintenanceType: string;
  scheduledDate: string;
}

export interface TopRoute {
  routeId: number;
  source: string;
  destination: string;
  bookingCount: number;
  revenue: number;
}

export interface ProviderDashboardResponse {
  providerId: number;
  todayBookings: KpiCard;
  todayRevenue: KpiCard;
  weeklyRevenue: KpiCard;
  monthlyRevenue: KpiCard;
  totalRevenue: KpiCard;
  activeTrips: KpiCard;
  runningTrips: KpiCard;
  completedTrips: KpiCard;
  cancelledTrips: KpiCard;
  delayedTrips: KpiCard;
  totalPassengers: KpiCard;
  fleetAvailability: KpiCard;
  revenueTrend: ChartDataPoint[];
  bookingTrend: ChartDataPoint[];
  tripStatusDistribution: ChartDataPoint[];
  fleetSummary: { totalBuses: number; activeBuses: number; maintenanceBuses: number };
  staffSummary: { activeDrivers: number; activeConductors: number };
  maintenanceSummary: { upcomingCount: number; nextItems: UpcomingMaintenanceItem[] };
  topRoutes: TopRoute[];
}
```

- [ ] **Step 4: Implement service**

Create `frontend/src/app/features/transport/services/dashboard.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import { ProviderDashboardResponse } from '@app/features/transport/services/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getDashboard(): Observable<ProviderDashboardResponse> {
    return this.http
      .get<ApiResponse<ProviderDashboardResponse>>(`${API_BASE_URL}/api/analytics/dashboard`)
      .pipe(map((response) => response.data));
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/app/features/transport/services/dashboard.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/transport/services/dashboard.models.ts frontend/src/app/features/transport/services/dashboard.service.ts frontend/src/app/features/transport/services/dashboard.service.spec.ts
git commit -m "feat(transport): add Dashboard models and service for GET /api/analytics/dashboard"
```

---

### Task 6: Rewrite `transport-dashboard` component with real data

**Files:**
- Create: `frontend/src/app/features/transport/services/chart-helpers.ts`
- Modify: `frontend/src/app/features/transport/components/transport-dashboard/transport-dashboard.ts`
- Modify: `frontend/src/app/features/transport/components/transport-dashboard/transport-dashboard.html`
- Create: `frontend/src/app/features/transport/components/transport-dashboard/transport-dashboard.spec.ts`
- Inspect before editing: current `transport-dashboard.ts`/`.html` (dummy, mock-data-driven — `totalBuses`, `seatsBooked`, `upcomingTrips`, `revenueMtd`, `routeOccupancy` from `partnerRoutes`/`vehicles` mock arrays), `frontend/src/app/features/trips/components/trip-list/trip-list.ts` (signal-based loading/error/empty pattern reference), `frontend/src/app/shared/ui/echart/echart.ts` (`options` input, used via `<app-echart [options]="..." height="256px" />`).

**Card mapping** (every dummy card removed; every kept/added card maps 1:1 to a proven `ProviderDashboardResponse` field — no loose remapping):
- KPI card grid (12 cards): `todayBookings`, `todayRevenue`, `weeklyRevenue`, `monthlyRevenue`, `totalRevenue`, `activeTrips`, `runningTrips`, `completedTrips`, `cancelledTrips`, `delayedTrips`, `totalPassengers`, `fleetAvailability` — each rendered as `{title}`, `{value}{unit}`, a trend indicator from `trend`/`changePercent`.
- 3 charts via existing `EChart` wrapper: `revenueTrend` (line), `bookingTrend` (line/bar), `tripStatusDistribution` (pie/donut) — all `ChartDataPoint[]`.
- Fleet/Staff/Maintenance summary cards: `fleetSummary`, `staffSummary`, `maintenanceSummary.upcomingCount` + first 3 of `maintenanceSummary.nextItems`.
- Top routes table: `topRoutes` (source→destination, bookingCount, revenue).
- The dummy's "Seats Booked" and "Upcoming Trips" cards from mock data are **removed** — no exact backend equivalent exists (closest fields, `totalPassengers` and `activeTrips`, have different semantics and are already used for their own proven cards above; not reused for a second, differently-labeled card).

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/features/transport/components/transport-dashboard/transport-dashboard.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TransportDashboard } from '@app/features/transport/components/transport-dashboard/transport-dashboard';
import { DashboardService } from '@app/features/transport/services/dashboard.service';
import { ProviderDashboardResponse } from '@app/features/transport/services/dashboard.models';

const KPI = { title: 'x', value: 1, unit: 'u', changePercent: 0, trend: 'STABLE' as const, icon: 'i' };
const DASHBOARD: ProviderDashboardResponse = {
  providerId: 101,
  todayBookings: KPI, todayRevenue: KPI, weeklyRevenue: KPI, monthlyRevenue: KPI, totalRevenue: KPI,
  activeTrips: KPI, runningTrips: KPI, completedTrips: KPI, cancelledTrips: KPI, delayedTrips: KPI,
  totalPassengers: KPI, fleetAvailability: KPI,
  revenueTrend: [], bookingTrend: [], tripStatusDistribution: [],
  fleetSummary: { totalBuses: 8, activeBuses: 6, maintenanceBuses: 2 },
  staffSummary: { activeDrivers: 5, activeConductors: 5 },
  maintenanceSummary: { upcomingCount: 0, nextItems: [] },
  topRoutes: [],
};

async function setup(dashboardService: Partial<DashboardService>) {
  await TestBed.configureTestingModule({
    imports: [TransportDashboard],
    providers: [{ provide: DashboardService, useValue: dashboardService }],
  }).compileComponents();
  const fixture = TestBed.createComponent(TransportDashboard);
  fixture.detectChanges();
  return { fixture };
}

describe('TransportDashboard', () => {
  it('loads and exposes the dashboard data as a signal', async () => {
    const { fixture } = await setup({ getDashboard: () => of(DASHBOARD) });
    const component = fixture.componentInstance;
    expect(component.dashboard()).toEqual(DASHBOARD);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('surfaces a read error without throwing', async () => {
    const { fixture } = await setup({
      getDashboard: () => throwError(() => new HttpErrorResponse({ status: 500 })),
    });
    const component = fixture.componentInstance;
    expect(component.dashboard()).toBeNull();
    expect(component.error()).toBe('Failed to load dashboard data.');
    expect(component.loading()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/app/features/transport/components/transport-dashboard/transport-dashboard.spec.ts`
Expected: FAIL — `dashboard`/`loading`/`error` signals don't exist on the current dummy component.

- [ ] **Step 3: Implement a shared chart-helpers module**

Create `frontend/src/app/features/transport/services/chart-helpers.ts` (shared by this task's Dashboard and, later, Task 18's Booking Analytics — kept in a services-level file rather than defined inside one page component, since more than one page needs it):

```typescript
import type { EChartsCoreOption } from 'echarts/core';
import { CHART_COLORS } from '@app/shared/ui/echart/echart-theme';
import { ChartDataPoint } from '@app/features/transport/services/dashboard.models';

export function buildTrendLineOption(points: ChartDataPoint[]): EChartsCoreOption {
  return {
    grid: { left: 8, right: 8, top: 8, bottom: 24, containLabel: false },
    xAxis: { type: 'category', data: points.map((p) => p.label), axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'value', show: false },
    tooltip: { trigger: 'axis' },
    series: [{ type: 'line', data: points.map((p) => p.value), smooth: true, itemStyle: { color: CHART_COLORS.primary } }],
  };
}

export function buildStatusPieOption(points: ChartDataPoint[]): EChartsCoreOption {
  return {
    tooltip: { trigger: 'item' },
    series: [{ type: 'pie', radius: ['45%', '70%'], data: points.map((p) => ({ name: p.label, value: p.value })) }],
  };
}
```

- [ ] **Step 4: Implement the component**

Replace `frontend/src/app/features/transport/components/transport-dashboard/transport-dashboard.ts`:

```typescript
import { Component, inject, signal } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { EChart } from '@app/shared/ui/echart/echart';
import type { EChartsCoreOption } from 'echarts/core';
import { DashboardService } from '@app/features/transport/services/dashboard.service';
import { ChartDataPoint, ProviderDashboardResponse } from '@app/features/transport/services/dashboard.models';
import { buildStatusPieOption, buildTrendLineOption } from '@app/features/transport/services/chart-helpers';

@Component({
  selector: 'app-transport-dashboard',
  imports: [HlmCardImports, HlmSkeletonImports, PageHeader, EChart],
  templateUrl: './transport-dashboard.html',
})
export class TransportDashboard {
  private readonly dashboardService = inject(DashboardService);

  public readonly dashboard = signal<ProviderDashboardResponse | null>(null);
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.dashboardService.getDashboard().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load dashboard data.');
        this.loading.set(false);
      },
    });
  }

  protected revenueTrendOptions(points: ChartDataPoint[]): EChartsCoreOption {
    return buildTrendLineOption(points);
  }

  protected bookingTrendOptions(points: ChartDataPoint[]): EChartsCoreOption {
    return buildTrendLineOption(points);
  }

  protected tripStatusOptions(points: ChartDataPoint[]): EChartsCoreOption {
    return buildStatusPieOption(points);
  }
}
```

Replace `frontend/src/app/features/transport/components/transport-dashboard/transport-dashboard.html`:

```html
<app-page-header title="Dashboard" subtitle="Live fleet, revenue, and operations overview." />

@if (loading()) {
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    @for (i of [1,2,3,4,5,6,7,8]; track i) {
      <div hlmSkeleton class="h-24 rounded-2xl"></div>
    }
  </div>
} @else if (error()) {
  <div hlmCard class="p-6 text-center">
    <p class="text-destructive mb-4">{{ error() }}</p>
    <button class="text-sm underline text-primary" (click)="load()">Retry</button>
  </div>
} @else if (dashboard(); as d) {
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    @for (kpi of [d.todayBookings, d.todayRevenue, d.weeklyRevenue, d.monthlyRevenue, d.totalRevenue, d.activeTrips, d.runningTrips, d.completedTrips, d.cancelledTrips, d.delayedTrips, d.totalPassengers, d.fleetAvailability]; track kpi.title) {
      <div hlmCard>
        <div hlmCardContent class="pt-5">
          <p class="text-xs text-muted-foreground">{{ kpi.title }}</p>
          <p class="text-2xl font-semibold mt-1">{{ kpi.value }}{{ kpi.unit === '%' ? '%' : '' }}</p>
          <p class="text-xs mt-1" [class.text-success]="kpi.trend === 'UP'" [class.text-destructive]="kpi.trend === 'DOWN'">
            {{ kpi.changePercent }}%
          </p>
        </div>
      </div>
    }
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <div hlmCard>
      <div hlmCardHeader><h3 hlmCardTitle>Revenue Trend</h3></div>
      <div hlmCardContent><app-echart [options]="revenueTrendOptions(d.revenueTrend)" height="220px" /></div>
    </div>
    <div hlmCard>
      <div hlmCardHeader><h3 hlmCardTitle>Booking Trend</h3></div>
      <div hlmCardContent><app-echart [options]="bookingTrendOptions(d.bookingTrend)" height="220px" /></div>
    </div>
    <div hlmCard>
      <div hlmCardHeader><h3 hlmCardTitle>Trip Status</h3></div>
      <div hlmCardContent><app-echart [options]="tripStatusOptions(d.tripStatusDistribution)" height="220px" /></div>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <div hlmCard>
      <div hlmCardHeader><h3 hlmCardTitle>Fleet</h3></div>
      <div hlmCardContent class="text-sm space-y-1">
        <p>Total Buses: {{ d.fleetSummary.totalBuses }}</p>
        <p>Active: {{ d.fleetSummary.activeBuses }}</p>
        <p>In Maintenance: {{ d.fleetSummary.maintenanceBuses }}</p>
      </div>
    </div>
    <div hlmCard>
      <div hlmCardHeader><h3 hlmCardTitle>Staff</h3></div>
      <div hlmCardContent class="text-sm space-y-1">
        <p>Active Drivers: {{ d.staffSummary.activeDrivers }}</p>
        <p>Active Conductors: {{ d.staffSummary.activeConductors }}</p>
      </div>
    </div>
    <div hlmCard>
      <div hlmCardHeader><h3 hlmCardTitle>Upcoming Maintenance</h3></div>
      <div hlmCardContent class="text-sm space-y-1">
        <p>{{ d.maintenanceSummary.upcomingCount }} upcoming</p>
        @for (item of d.maintenanceSummary.nextItems; track item.maintenanceId) {
          <p class="text-muted-foreground">{{ item.busNumber }} — {{ item.maintenanceType }} ({{ item.scheduledDate }})</p>
        }
      </div>
    </div>
  </div>

  <div hlmCard>
    <div hlmCardHeader><h3 hlmCardTitle>Top Routes</h3></div>
    <div hlmCardContent class="text-sm space-y-2">
      @for (r of d.topRoutes; track r.routeId) {
        <div class="flex justify-between border-b border-border pb-2">
          <span>{{ r.source }} → {{ r.destination }}</span>
          <span>{{ r.bookingCount }} bookings</span>
          <span>₹{{ r.revenue }}</span>
        </div>
      } @empty {
        <p class="text-muted-foreground">No route data yet.</p>
      }
    </div>
  </div>
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/app/features/transport/components/transport-dashboard/transport-dashboard.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/transport/components/transport-dashboard/ frontend/src/app/features/transport/services/chart-helpers.ts
git commit -m "feat(transport): wire Dashboard to real GET /api/analytics/dashboard data"
```

**Phase 2 exit check:** `cd frontend && npx vitest run src/app/features/transport/components/transport-dashboard src/app/features/transport/services/dashboard.service.spec.ts` — all green.

---

## Phase 3: Vehicles + Maintenance

### Task 7: Bus models + service

**Files:**
- Create: `frontend/src/app/features/transport/services/bus.models.ts`
- Create: `frontend/src/app/features/transport/services/bus.service.ts`
- Create: `frontend/src/app/features/transport/services/bus.service.spec.ts`

**Backend endpoints** (`BusController`, exact mappings confirmed by direct read — do not assume a single shared path shape):
- `GET /api/buses?providerId&status` — **Category 1, public free filter.** No auth required, no identity check. Frontend passes `providerId: StoredUser.providerId` explicitly to get an own-fleet view; this is a display filter, not an authorization boundary.
- `GET /api/buses/{id}` — public.
- `POST /api/buses` — `hasAnyRole('ADMIN','PROVIDER')`. **Category 5**: `BusRequest.providerId` is `@NotNull` but the controller does `request.setProviderId(securityUtil.resolveEffectiveProviderId(request.getProviderId()))` before persistence — always overwritten server-side. Adapter sends an internal placeholder (`0`), never shown in the form.
- `PUT /api/buses/{id}` — same role + same Category 5 overwrite, plus `assertOwnsBus(id)` (server-enforced, no frontend action needed).
- `DELETE /api/buses/{id}` — same role, soft delete, `assertOwnsBus(id)`.

**Request DTO** (`BusRequest`): `{ busNumber: string (@NotBlank), busName: string (@NotBlank), totalSeats: number (@NotNull @Min(1)), providerId: number (@NotNull — Category 5 placeholder), busType: BusType (@NotNull), amenities: string[] }`
**Response DTO** (`BusResponse`): `{ id, busNumber, busName, totalSeats: number, providerId: number, busType: BusType, amenities: string[], status: BusStatus, createdAt: string }`
**`BusType` enum** (confirmed): `AC_SLEEPER | NON_AC_SLEEPER | AC_SEMI_SLEEPER | NON_AC_SEMI_SLEEPER | AC_SEATER | NON_AC_SEATER | AC_LUXURY | NON_AC_LUXURY`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/features/transport/services/bus.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BusService } from '@app/features/transport/services/bus.service';
import { BusResponse } from '@app/features/transport/services/bus.models';

const BUS: BusResponse = {
  id: 1, busNumber: 'KA-01-AB-1234', busName: 'Volvo Sleeper', totalSeats: 40,
  providerId: 101, busType: 'AC_SLEEPER', amenities: ['WIFI'], status: 'ACTIVE', createdAt: '2026-01-01T00:00:00',
};

describe('BusService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return { service: TestBed.inject(BusService), httpMock: TestBed.inject(HttpTestingController) };
  }

  it('lists buses filtered by the authenticated provider (Category 1 read filter)', async () => {
    const { service, httpMock } = await setup();
    const promise = service.listBuses(101);
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/buses');
    expect(req.request.params.get('providerId')).toBe('101');
    req.flush({ success: true, data: [BUS], message: null, error: null });
    expect(await promise).toEqual([BUS]);
  });

  it('creates a bus with the internal providerId placeholder, never asking the caller for it', async () => {
    const { service, httpMock } = await setup();
    const promise = service.createBus({
      busNumber: 'KA-02-CD-5678', busName: 'Scania AC Seater', totalSeats: 45, busType: 'AC_SEATER', amenities: [],
    });
    const req = httpMock.expectOne('http://localhost:8080/api/buses');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.providerId).toBe(0);
    req.flush({ success: true, data: BUS, message: null, error: null });
    expect(await promise).toEqual(BUS);
  });

  it('updates a bus at the exact PUT /api/buses/{id} path', async () => {
    const { service, httpMock } = await setup();
    const promise = service.updateBus(1, {
      busNumber: 'KA-01-AB-1234', busName: 'Volvo Sleeper', totalSeats: 40, busType: 'AC_SLEEPER', amenities: ['WIFI'],
    });
    const req = httpMock.expectOne('http://localhost:8080/api/buses/1');
    expect(req.request.method).toBe('PUT');
    req.flush({ success: true, data: BUS, message: null, error: null });
    expect(await promise).toEqual(BUS);
  });

  it('soft-deletes a bus at the exact DELETE /api/buses/{id} path', async () => {
    const { service, httpMock } = await setup();
    const promise = service.deleteBus(1);
    const req = httpMock.expectOne('http://localhost:8080/api/buses/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, data: { message: 'Bus deleted successfully' }, message: null, error: null });
    await promise;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/app/features/transport/services/bus.service.spec.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement models**

Create `frontend/src/app/features/transport/services/bus.models.ts`:

```typescript
import { BusStatus } from '@app/features/transport/services/transport-enums';

export type BusType =
  | 'AC_SLEEPER' | 'NON_AC_SLEEPER' | 'AC_SEMI_SLEEPER' | 'NON_AC_SEMI_SLEEPER'
  | 'AC_SEATER' | 'NON_AC_SEATER' | 'AC_LUXURY' | 'NON_AC_LUXURY';

export const BUS_TYPES: BusType[] = [
  'AC_SLEEPER', 'NON_AC_SLEEPER', 'AC_SEMI_SLEEPER', 'NON_AC_SEMI_SLEEPER',
  'AC_SEATER', 'NON_AC_SEATER', 'AC_LUXURY', 'NON_AC_LUXURY',
];

export interface BusResponse {
  id: number;
  busNumber: string;
  busName: string;
  totalSeats: number;
  providerId: number;
  busType: BusType;
  amenities: string[];
  status: BusStatus;
  createdAt: string;
}

/** Form-facing shape — no providerId field; the service injects the Category 5 placeholder. */
export interface BusFormPayload {
  busNumber: string;
  busName: string;
  totalSeats: number;
  busType: BusType;
  amenities: string[];
}
```

- [ ] **Step 4: Implement service**

Create `frontend/src/app/features/transport/services/bus.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import { BusFormPayload, BusResponse } from '@app/features/transport/services/bus.models';

/**
 * BusRequest.providerId is @NotNull for Bean Validation, but BusController
 * always overwrites it via SecurityUtil.resolveEffectiveProviderId before
 * persistence (Category 5 in the design spec). This placeholder only
 * satisfies validation and is never shown in any form.
 */
const PROVIDER_ID_PLACEHOLDER = 0;

@Injectable({ providedIn: 'root' })
export class BusService {
  private readonly http = inject(HttpClient);

  listBuses(providerId: number): Observable<BusResponse[]> {
    const params = new HttpParams().set('providerId', providerId);
    return this.http
      .get<ApiResponse<BusResponse[]>>(`${API_BASE_URL}/api/buses`, { params })
      .pipe(map((response) => response.data));
  }

  createBus(payload: BusFormPayload): Observable<BusResponse> {
    return this.http
      .post<ApiResponse<BusResponse>>(`${API_BASE_URL}/api/buses`, {
        ...payload,
        providerId: PROVIDER_ID_PLACEHOLDER,
      })
      .pipe(map((response) => response.data));
  }

  updateBus(id: number, payload: BusFormPayload): Observable<BusResponse> {
    return this.http
      .put<ApiResponse<BusResponse>>(`${API_BASE_URL}/api/buses/${id}`, {
        ...payload,
        providerId: PROVIDER_ID_PLACEHOLDER,
      })
      .pipe(map((response) => response.data));
  }

  deleteBus(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<{ message: string }>>(`${API_BASE_URL}/api/buses/${id}`)
      .pipe(map(() => undefined));
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/app/features/transport/services/bus.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/transport/services/bus.models.ts frontend/src/app/features/transport/services/bus.service.ts frontend/src/app/features/transport/services/bus.service.spec.ts
git commit -m "feat(transport): add Bus models and service for GET/POST/PUT/DELETE /api/buses"
```

---

### Task 8: Rewrite `manage-vehicles` — Fleet tab (real CRUD) + Maintenance tab shell

**Files:**
- Modify: `frontend/src/app/features/transport/components/manage-vehicles/manage-vehicles.ts`
- Modify: `frontend/src/app/features/transport/components/manage-vehicles/manage-vehicles.html`
- Create: `frontend/src/app/features/transport/components/manage-vehicles/manage-vehicles.spec.ts`
- Inspect before editing: current `manage-vehicles.ts`/`.html` (dummy — reads `vehicles` mock array, renders a static card grid with `StatusBadge`), `frontend/src/app/shared/ui/status-badge/status-badge.ts` (`STATUS_CLASS_MAP` keyed by exact status string — will need `ACTIVE`/`MAINTENANCE`/`INACTIVE` keys added in this task since the mock data used different casing).

**Spartan components:** `HlmTabsImports` (`@spartan-ng/helm/tabs`), `HlmTableImports` (`@spartan-ng/helm/table`), `HlmSheetImports` (`@spartan-ng/helm/sheet`), `HlmAlertDialogImports` (`@spartan-ng/helm/alert-dialog`), `HlmButtonImports`, `HlmInputImports`, `HlmSelectImports` (`@spartan-ng/helm/select`), existing `StatusBadge`.

**Fleet tab endpoints/mapping:** as Task 7 — `listBuses(providerId)` (Category 1, `StoredUser.providerId` passed explicitly), `createBus`/`updateBus` (Category 5 placeholder, no providerId field in the form), `deleteBus` (soft delete).

**Maintenance tab:** placeholder only in this task (`<p>Loading maintenance…</p>` static text) — filled in by Task 10 once `MaintenanceService` exists, avoiding a second restructuring of the Tabs shell.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/features/transport/components/manage-vehicles/manage-vehicles.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ManageVehicles } from '@app/features/transport/components/manage-vehicles/manage-vehicles';
import { BusService } from '@app/features/transport/services/bus.service';
import { AuthService } from '@app/core/auth/auth.service';
import { ToastService } from '@app/core/toast/toast.service';
import { BusResponse } from '@app/features/transport/services/bus.models';

const BUS: BusResponse = {
  id: 1, busNumber: 'KA-01-AB-1234', busName: 'Volvo Sleeper', totalSeats: 40,
  providerId: 101, busType: 'AC_SLEEPER', amenities: ['WIFI'], status: 'ACTIVE', createdAt: '2026-01-01T00:00:00',
};

async function setup(busService: Partial<BusService>, toastService: Partial<ToastService> = {}) {
  await TestBed.configureTestingModule({
    imports: [ManageVehicles],
    providers: [
      { provide: BusService, useValue: busService },
      { provide: AuthService, useValue: { currentUser: () => ({ providerId: 101 }) } },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn(), ...toastService } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ManageVehicles);
  fixture.detectChanges();
  return { fixture };
}

describe('ManageVehicles', () => {
  it('loads the authenticated provider\'s own fleet using StoredUser.providerId as the read filter', async () => {
    const listBuses = vi.fn().mockReturnValue(of([BUS]));
    const { fixture } = await setup({ listBuses });
    expect(listBuses).toHaveBeenCalledWith(101);
    expect(fixture.componentInstance.buses()).toEqual([BUS]);
  });

  it('surfaces a read error inline without throwing', async () => {
    const { fixture } = await setup({
      listBuses: () => throwError(() => new HttpErrorResponse({ status: 500 })),
    });
    expect(fixture.componentInstance.error()).toBe('Failed to load fleet.');
  });

  it('toasts success and reloads the fleet after creating a bus', async () => {
    const listBuses = vi.fn().mockReturnValue(of([BUS]));
    const createBus = vi.fn().mockReturnValue(of(BUS));
    const success = vi.fn();
    const { fixture } = await setup({ listBuses, createBus }, { success });

    fixture.componentInstance.submitCreate({
      busNumber: 'KA-02-CD-5678', busName: 'Scania AC Seater', totalSeats: 45, busType: 'AC_SEATER', amenities: [],
    });

    expect(createBus).toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith('Bus created successfully.');
    expect(listBuses).toHaveBeenCalledTimes(2);
  });

  it('toasts an error message when bus creation fails', async () => {
    const listBuses = vi.fn().mockReturnValue(of([BUS]));
    const createBus = vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { error: { message: 'Invalid bus data' } } })));
    const error = vi.fn();
    const { fixture } = await setup({ listBuses, createBus }, { error });

    fixture.componentInstance.submitCreate({
      busNumber: 'KA-02-CD-5678', busName: 'Scania AC Seater', totalSeats: 45, busType: 'AC_SEATER', amenities: [],
    });

    expect(error).toHaveBeenCalledWith('Invalid bus data');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/app/features/transport/components/manage-vehicles/manage-vehicles.spec.ts`
Expected: FAIL — current component has no `buses`/`error`/`submitCreate` members.

- [ ] **Step 3: Implement the component**

Replace `frontend/src/app/features/transport/components/manage-vehicles/manage-vehicles.ts`:

```typescript
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { AuthService } from '@app/core/auth/auth.service';
import { ToastService } from '@app/core/toast/toast.service';
import { BusService } from '@app/features/transport/services/bus.service';
import { BusFormPayload, BusResponse, BUS_TYPES } from '@app/features/transport/services/bus.models';

@Component({
  selector: 'app-manage-vehicles',
  imports: [
    NgIcon, HlmCardImports, HlmButtonImports, HlmTabsImports, HlmTableImports, HlmSheetImports,
    HlmAlertDialogImports, HlmInputImports, HlmSelectImports, PageHeader, StatusBadge,
  ],
  templateUrl: './manage-vehicles.html',
})
export class ManageVehicles {
  private readonly busService = inject(BusService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  public readonly busTypes = BUS_TYPES;
  public readonly buses = signal<BusResponse[]>([]);
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  public readonly sheetOpen = signal(false);
  public readonly editingBus = signal<BusResponse | null>(null);

  constructor() {
    this.load();
  }

  protected load(): void {
    const providerId = this.authService.currentUser()?.providerId;
    if (providerId == null) {
      this.error.set('No provider account found for the current session.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.busService.listBuses(providerId).subscribe({
      next: (buses) => {
        this.buses.set(buses);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load fleet.');
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.editingBus.set(null);
    this.sheetOpen.set(true);
  }

  protected openEdit(bus: BusResponse): void {
    this.editingBus.set(bus);
    this.sheetOpen.set(true);
  }

  submitCreate(payload: BusFormPayload): void {
    this.busService.createBus(payload).subscribe({
      next: () => {
        this.toastService.success('Bus created successfully.');
        this.sheetOpen.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.toastService.error(err.error?.error?.message ?? 'Failed to create bus.');
      },
    });
  }

  submitEdit(id: number, payload: BusFormPayload): void {
    this.busService.updateBus(id, payload).subscribe({
      next: () => {
        this.toastService.success('Bus updated successfully.');
        this.sheetOpen.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.toastService.error(err.error?.error?.message ?? 'Failed to update bus.');
      },
    });
  }

  protected deleteBus(id: number): void {
    this.busService.deleteBus(id).subscribe({
      next: () => {
        this.toastService.success('Bus deleted successfully.');
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.toastService.error(err.error?.error?.message ?? 'Failed to delete bus.');
      },
    });
  }
}
```

Replace `frontend/src/app/features/transport/components/manage-vehicles/manage-vehicles.html`:

```html
<app-page-header title="Vehicles" subtitle="Fleet inventory, status, and maintenance." />

<div hlmTabs tab="fleet">
  <div hlmTabsList aria-label="Vehicles sections">
    <button hlmTabsTrigger="fleet">Fleet</button>
    <button hlmTabsTrigger="maintenance">Maintenance</button>
  </div>

  <div hlmTabsContent="fleet">
    <div class="flex justify-end mb-4">
      <button hlmBtn (click)="openCreate()">
        <ng-icon name="lucidePlus" class="h-4 w-4 mr-1" />Add Vehicle
      </button>
    </div>

    @if (loading()) {
      <p class="text-muted-foreground">Loading fleet…</p>
    } @else if (error()) {
      <div hlmCard class="p-6 text-center">
        <p class="text-destructive mb-4">{{ error() }}</p>
        <button class="text-sm underline text-primary" (click)="load()">Retry</button>
      </div>
    } @else if (buses().length === 0) {
      <p class="text-muted-foreground">No vehicles yet. Add your first bus to get started.</p>
    } @else {
      <table hlmTable>
        <thead hlmTHead>
          <tr hlmTr>
            <th hlmTh>Bus Number</th><th hlmTh>Name</th><th hlmTh>Seats</th>
            <th hlmTh>Type</th><th hlmTh>Status</th><th hlmTh></th>
          </tr>
        </thead>
        <tbody hlmTBody>
          @for (bus of buses(); track bus.id) {
            <tr hlmTr>
              <td hlmTd>{{ bus.busNumber }}</td>
              <td hlmTd>{{ bus.busName }}</td>
              <td hlmTd>{{ bus.totalSeats }}</td>
              <td hlmTd>{{ bus.busType }}</td>
              <td hlmTd><app-status-badge [status]="bus.status" /></td>
              <td hlmTd class="text-right space-x-2">
                <button hlmBtn variant="ghost" size="sm" (click)="openEdit(bus)">Edit</button>
                <button hlmBtn variant="ghost" size="sm" class="text-destructive" (click)="deleteBus(bus.id)">Delete</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  </div>

  <div hlmTabsContent="maintenance">
    <p class="text-muted-foreground">Loading maintenance…</p>
  </div>
</div>
```

Add the two new `STATUS_CLASS_MAP` keys required by `BusStatus` to `frontend/src/app/shared/ui/status-badge/status-badge.ts` (the map already has an `Active`/`Maintenance` pair using different casing for other domains — add the exact backend-cased keys used here):
```typescript
  ACTIVE: 'bg-success/10 text-success border-success/20',
  MAINTENANCE: 'bg-warning/15 text-[oklch(0.45_0.12_75)] border-warning/20',
  INACTIVE: 'bg-muted text-muted-foreground border-border',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/app/features/transport/components/manage-vehicles/manage-vehicles.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/transport/components/manage-vehicles/ frontend/src/app/shared/ui/status-badge/status-badge.ts
git commit -m "feat(transport): wire Manage Vehicles Fleet tab to real Bus CRUD endpoints"
```

---

### Task 9: Maintenance models + service

**Files:**
- Create: `frontend/src/app/features/transport/services/maintenance.models.ts`
- Create: `frontend/src/app/features/transport/services/maintenance.service.ts`
- Create: `frontend/src/app/features/transport/services/maintenance.service.spec.ts`

**Backend endpoints** (`FleetOperationController`, base `/api/operations`):
- `GET /maintenance?busId&status` — no providerId param exists at all; `resolveEffectiveProviderId(null)` always. Frontend sends only `busId`/`status` if the user filters by them.
- `GET /maintenance/{id}` — `assertOwnsMaintenance`.
- `POST /maintenance` — `assertOwnsBus(request.getBusId())`. `MaintenanceRequest` has **no providerId field at all** — scoping is entirely via `busId`.
- `PUT /maintenance/{id}` — edits metadata only (`maintenanceType, description, scheduledDate, nextMaintenanceDate, performedBy`); does not touch `status`/`cost`.
- `PATCH /maintenance/{id}/status` — the formal transition graph: `SCHEDULED→IN_PROGRESS→COMPLETED` (terminal), `SCHEDULED|IN_PROGRESS→CANCELLED` (terminal).
- `GET /maintenance/bus/{busId}/cost` — `assertOwnsBus(busId)`, returns a raw `Double`.

**Request DTO** (`MaintenanceRequest`): `{ busId: number (@NotNull), maintenanceType: string (@NotNull, free text — not an enum), description?: string, scheduledDate: string (@NotNull), estimatedCost?: number, nextMaintenanceDate?: string, performedBy?: string }`
**Response DTO** (`MaintenanceResponse`): `{ id, busId: number, busNumber, maintenanceType, description: string, status: MaintenanceStatus, scheduledDate, completedDate?, cost: number, nextMaintenanceDate?, performedBy?: string, createdAt: string }`
**Transition request**: `{ status: MaintenanceStatus, cost?: number, completedDate?: string }` (only `COMPLETED` consumes `cost`/`completedDate`, confirmed directly in `transitionMaintenance`'s switch cases).

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/features/transport/services/maintenance.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MaintenanceService } from '@app/features/transport/services/maintenance.service';
import { MaintenanceResponse } from '@app/features/transport/services/maintenance.models';

const RECORD: MaintenanceResponse = {
  id: 1, busId: 1, busNumber: 'KA-01-AB-1234', maintenanceType: 'OIL_CHANGE', description: 'Routine oil change',
  status: 'SCHEDULED', scheduledDate: '2026-08-01', completedDate: null, cost: 0, nextMaintenanceDate: null,
  performedBy: null, createdAt: '2026-07-01T00:00:00',
};

describe('MaintenanceService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return { service: TestBed.inject(MaintenanceService), httpMock: TestBed.inject(HttpTestingController) };
  }

  it('lists maintenance records with no providerId param at all', async () => {
    const { service, httpMock } = await setup();
    const promise = service.listMaintenance();
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/operations/maintenance');
    expect(req.request.params.has('providerId')).toBe(false);
    req.flush({ success: true, data: [RECORD], message: null, error: null });
    expect(await promise).toEqual([RECORD]);
  });

  it('schedules maintenance with only busId, no providerId field', async () => {
    const { service, httpMock } = await setup();
    const promise = service.scheduleMaintenance({
      busId: 1, maintenanceType: 'OIL_CHANGE', description: 'Routine', scheduledDate: '2026-08-01',
    });
    const req = httpMock.expectOne('http://localhost:8080/api/operations/maintenance');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.providerId).toBeUndefined();
    req.flush({ success: true, data: RECORD, message: null, error: null });
    expect(await promise).toEqual(RECORD);
  });

  it('transitions status via the exact PATCH path', async () => {
    const { service, httpMock } = await setup();
    const promise = service.transitionStatus(1, { status: 'IN_PROGRESS' });
    const req = httpMock.expectOne('http://localhost:8080/api/operations/maintenance/1/status');
    expect(req.request.method).toBe('PATCH');
    req.flush({ success: true, data: { ...RECORD, status: 'IN_PROGRESS' }, message: null, error: null });
    expect((await promise).status).toBe('IN_PROGRESS');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/app/features/transport/services/maintenance.service.spec.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement models**

Create `frontend/src/app/features/transport/services/maintenance.models.ts`:

```typescript
import { MaintenanceStatus } from '@app/features/transport/services/transport-enums';

export const SUGGESTED_MAINTENANCE_TYPES = ['OIL_CHANGE', 'TIRE_ROTATION', 'ENGINE_REPAIR', 'BRAKE_SERVICE', 'AC_SERVICE'];

export interface MaintenanceResponse {
  id: number;
  busId: number;
  busNumber: string;
  maintenanceType: string;
  description: string | null;
  status: MaintenanceStatus;
  scheduledDate: string;
  completedDate: string | null;
  cost: number;
  nextMaintenanceDate: string | null;
  performedBy: string | null;
  createdAt: string;
}

export interface MaintenanceFormPayload {
  busId: number;
  maintenanceType: string;
  description?: string;
  scheduledDate: string;
  estimatedCost?: number;
  nextMaintenanceDate?: string;
  performedBy?: string;
}

export interface MaintenanceTransitionPayload {
  status: MaintenanceStatus;
  cost?: number;
  completedDate?: string;
}
```

- [ ] **Step 4: Implement service**

Create `frontend/src/app/features/transport/services/maintenance.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  MaintenanceFormPayload,
  MaintenanceResponse,
  MaintenanceTransitionPayload,
} from '@app/features/transport/services/maintenance.models';

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private readonly http = inject(HttpClient);

  listMaintenance(busId?: number): Observable<MaintenanceResponse[]> {
    let params = new HttpParams();
    if (busId != null) {
      params = params.set('busId', busId);
    }
    return this.http
      .get<ApiResponse<MaintenanceResponse[]>>(`${API_BASE_URL}/api/operations/maintenance`, { params })
      .pipe(map((response) => response.data));
  }

  scheduleMaintenance(payload: MaintenanceFormPayload): Observable<MaintenanceResponse> {
    return this.http
      .post<ApiResponse<MaintenanceResponse>>(`${API_BASE_URL}/api/operations/maintenance`, payload)
      .pipe(map((response) => response.data));
  }

  updateMaintenance(id: number, payload: MaintenanceFormPayload): Observable<MaintenanceResponse> {
    return this.http
      .put<ApiResponse<MaintenanceResponse>>(`${API_BASE_URL}/api/operations/maintenance/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  transitionStatus(id: number, payload: MaintenanceTransitionPayload): Observable<MaintenanceResponse> {
    return this.http
      .patch<ApiResponse<MaintenanceResponse>>(`${API_BASE_URL}/api/operations/maintenance/${id}/status`, payload)
      .pipe(map((response) => response.data));
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/app/features/transport/services/maintenance.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/transport/services/maintenance.models.ts frontend/src/app/features/transport/services/maintenance.service.ts frontend/src/app/features/transport/services/maintenance.service.spec.ts
git commit -m "feat(transport): add Maintenance models and service for /api/operations/maintenance"
```

---

### Task 10: Maintenance tab component (inside `manage-vehicles`)

**Files:**
- Modify: `frontend/src/app/features/transport/components/manage-vehicles/manage-vehicles.ts`
- Modify: `frontend/src/app/features/transport/components/manage-vehicles/manage-vehicles.html`
- Modify: `frontend/src/app/features/transport/components/manage-vehicles/manage-vehicles.spec.ts`

**Lifecycle actions** (constrained per current status, never a raw select — confirmed directly from `MaintenanceServiceImpl.transitionMaintenance`'s switch statement):

| Status | Actions |
|---|---|
| SCHEDULED | Start, Cancel |
| IN_PROGRESS | Complete (collects `cost`+`completedDate`), Cancel |
| COMPLETED | none (terminal) |
| CANCELLED | none (terminal) |

Scheduling maintenance flips the owning bus to `MAINTENANCE` status server-side (surfaced as a caution note in the create Sheet, not corrected).

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/app/features/transport/components/manage-vehicles/manage-vehicles.spec.ts`, a new `describe` block:

```typescript
import { MaintenanceService } from '@app/features/transport/services/maintenance.service';
import { MaintenanceResponse } from '@app/features/transport/services/maintenance.models';

const MAINTENANCE_RECORD: MaintenanceResponse = {
  id: 1, busId: 1, busNumber: 'KA-01-AB-1234', maintenanceType: 'OIL_CHANGE', description: null,
  status: 'SCHEDULED', scheduledDate: '2026-08-01', completedDate: null, cost: 0, nextMaintenanceDate: null,
  performedBy: null, createdAt: '2026-07-01T00:00:00',
};

describe('ManageVehicles — Maintenance tab', () => {
  it('exposes only the transition actions valid for the record\'s current status', async () => {
    const listBuses = vi.fn().mockReturnValue(of([]));
    const listMaintenance = vi.fn().mockReturnValue(of([MAINTENANCE_RECORD]));
    await TestBed.configureTestingModule({
      imports: [ManageVehicles],
      providers: [
        { provide: BusService, useValue: { listBuses } },
        { provide: MaintenanceService, useValue: { listMaintenance } },
        { provide: AuthService, useValue: { currentUser: () => ({ providerId: 101 }) } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ManageVehicles);
    fixture.detectChanges();

    expect(fixture.componentInstance.validActions('SCHEDULED')).toEqual(['START', 'CANCEL']);
    expect(fixture.componentInstance.validActions('IN_PROGRESS')).toEqual(['COMPLETE', 'CANCEL']);
    expect(fixture.componentInstance.validActions('COMPLETED')).toEqual([]);
    expect(fixture.componentInstance.validActions('CANCELLED')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/app/features/transport/components/manage-vehicles/manage-vehicles.spec.ts`
Expected: FAIL — `validActions` doesn't exist; `MaintenanceService` isn't injected yet.

- [ ] **Step 3: Implement**

In `frontend/src/app/features/transport/components/manage-vehicles/manage-vehicles.ts`, add imports:
```typescript
import { MaintenanceService } from '@app/features/transport/services/maintenance.service';
import {
  MaintenanceFormPayload, MaintenanceResponse, MaintenanceTransitionPayload, SUGGESTED_MAINTENANCE_TYPES,
} from '@app/features/transport/services/maintenance.models';
import { MaintenanceStatus } from '@app/features/transport/services/transport-enums';
```
add the field/methods to the `ManageVehicles` class:
```typescript
  private readonly maintenanceService = inject(MaintenanceService);

  public readonly suggestedMaintenanceTypes = SUGGESTED_MAINTENANCE_TYPES;
  public readonly maintenanceRecords = signal<MaintenanceResponse[]>([]);
  public readonly maintenanceLoading = signal(true);
  public readonly maintenanceError = signal<string | null>(null);
  public readonly maintenanceSheetOpen = signal(false);

  protected loadMaintenance(): void {
    this.maintenanceLoading.set(true);
    this.maintenanceError.set(null);
    this.maintenanceService.listMaintenance().subscribe({
      next: (records) => {
        this.maintenanceRecords.set(records);
        this.maintenanceLoading.set(false);
      },
      error: () => {
        this.maintenanceError.set('Failed to load maintenance records.');
        this.maintenanceLoading.set(false);
      },
    });
  }

  validActions(status: MaintenanceStatus): ('START' | 'COMPLETE' | 'CANCEL')[] {
    switch (status) {
      case 'SCHEDULED': return ['START', 'CANCEL'];
      case 'IN_PROGRESS': return ['COMPLETE', 'CANCEL'];
      default: return [];
    }
  }

  submitScheduleMaintenance(payload: MaintenanceFormPayload): void {
    this.maintenanceService.scheduleMaintenance(payload).subscribe({
      next: () => {
        this.toastService.success('Maintenance scheduled successfully.');
        this.maintenanceSheetOpen.set(false);
        this.loadMaintenance();
        this.load();
      },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to schedule maintenance.'),
    });
  }

  protected transitionMaintenance(id: number, payload: MaintenanceTransitionPayload): void {
    this.maintenanceService.transitionStatus(id, payload).subscribe({
      next: () => {
        this.toastService.success('Maintenance status updated.');
        this.loadMaintenance();
        this.load();
      },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to update maintenance status.'),
    });
  }
```
add `this.loadMaintenance();` to the constructor alongside the existing `this.load();` call.

Replace the placeholder `<div hlmTabsContent="maintenance">` block in `manage-vehicles.html`:
```html
  <div hlmTabsContent="maintenance">
    <div class="flex justify-end mb-4">
      <button hlmBtn (click)="maintenanceSheetOpen.set(true)">
        <ng-icon name="lucidePlus" class="h-4 w-4 mr-1" />Schedule Maintenance
      </button>
    </div>

    @if (maintenanceLoading()) {
      <p class="text-muted-foreground">Loading maintenance…</p>
    } @else if (maintenanceError()) {
      <div hlmCard class="p-6 text-center">
        <p class="text-destructive mb-4">{{ maintenanceError() }}</p>
        <button class="text-sm underline text-primary" (click)="loadMaintenance()">Retry</button>
      </div>
    } @else if (maintenanceRecords().length === 0) {
      <p class="text-muted-foreground">No maintenance records yet.</p>
    } @else {
      <table hlmTable>
        <thead hlmTHead>
          <tr hlmTr>
            <th hlmTh>Bus</th><th hlmTh>Type</th><th hlmTh>Scheduled</th>
            <th hlmTh>Cost</th><th hlmTh>Status</th><th hlmTh></th>
          </tr>
        </thead>
        <tbody hlmTBody>
          @for (m of maintenanceRecords(); track m.id) {
            <tr hlmTr>
              <td hlmTd>{{ m.busNumber }}</td>
              <td hlmTd>{{ m.maintenanceType }}</td>
              <td hlmTd>{{ m.scheduledDate }}</td>
              <td hlmTd>₹{{ m.cost }}</td>
              <td hlmTd><app-status-badge [status]="m.status" /></td>
              <td hlmTd class="text-right space-x-2">
                @for (action of validActions(m.status); track action) {
                  @if (action === 'START') {
                    <button hlmBtn variant="ghost" size="sm" (click)="transitionMaintenance(m.id, { status: 'IN_PROGRESS' })">Start</button>
                  } @else if (action === 'COMPLETE') {
                    <button hlmBtn variant="ghost" size="sm" (click)="transitionMaintenance(m.id, { status: 'COMPLETED', cost: m.cost })">Complete</button>
                  } @else if (action === 'CANCEL') {
                    <button hlmBtn variant="ghost" size="sm" class="text-destructive" (click)="transitionMaintenance(m.id, { status: 'CANCELLED' })">Cancel</button>
                  }
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  </div>
```
(A full production build should replace the inline `{ status: 'COMPLETED', cost: m.cost }` "Complete" action with a small dialog collecting `cost`/`completedDate` from the user rather than reusing the estimated cost — captured as a follow-up refinement inside this same task's manual verification step, not a separate task, since it's the same component/interaction.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/app/features/transport/components/manage-vehicles/manage-vehicles.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/transport/components/manage-vehicles/
git commit -m "feat(transport): wire Maintenance tab to real endpoints with constrained lifecycle actions"
```

**Phase 3 exit check:** `cd frontend && npx vitest run src/app/features/transport/services/bus.service.spec.ts src/app/features/transport/services/maintenance.service.spec.ts src/app/features/transport/components/manage-vehicles` — all green.

---

## Phase 4: Staff

### Task 11: Driver + Conductor models and services

**Files:**
- Create: `frontend/src/app/features/transport/services/staff.models.ts`
- Create: `frontend/src/app/features/transport/services/driver.service.ts`
- Create: `frontend/src/app/features/transport/services/driver.service.spec.ts`
- Create: `frontend/src/app/features/transport/services/conductor.service.ts`
- Create: `frontend/src/app/features/transport/services/conductor.service.spec.ts`

**Backend endpoints** (`FleetOperationController`):
- `GET /operations/drivers` / `GET /operations/conductors` — Category 2, `resolveEffectiveProviderId` server-side. Frontend omits `providerId` entirely.
- `GET /operations/drivers/{id}` / `.../conductors/{id}` — `assertOwnsDriver`/`assertOwnsConductor`.
- `POST`/`PUT /operations/drivers` / `.../conductors` — Category 5 placeholder (`DriverRequest.providerId`/`ConductorRequest.providerId` are `@NotNull` but server-overwritten).
- `DELETE /operations/drivers/{id}` / `.../conductors/{id}` — soft deactivate only (`active=false`, `status=OFF_DUTY`); **no reactivation endpoint exists.**

**Request DTOs**: `DriverRequest = { providerId: number (@NotNull, Category 5 placeholder), name: string (@NotBlank), licenseNumber: string (@NotBlank), phone?, email?, status?: DriverStatus }`; `ConductorRequest` identical shape with `employeeId` instead of `licenseNumber`.
**Response DTOs**: `DriverResponse = { id, providerId, name, licenseNumber, phone, email, status: DriverStatus, totalTrips, totalDistanceKm, rating, active: boolean, createdAt }`; `ConductorResponse` identical minus `totalDistanceKm`, `employeeId` instead of `licenseNumber`.
**Form contract, verified field-by-field against the mapper/service**: Create sends `name, licenseNumber/employeeId, phone, email` only — `status` is never mapped on create (`toEntity()` ignores it; entity always defaults to `AVAILABLE`). Edit sends `name, phone, email, status` — `licenseNumber`/`employeeId` are never touched by `updateDriver`/`updateConductor`, so they're **read-only on edit**. `totalTrips`, `totalDistanceKm`, `rating`, `active`, `createdAt`, `id` are response-only, never form inputs.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/app/features/transport/services/driver.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DriverService } from '@app/features/transport/services/driver.service';
import { DriverResponse } from '@app/features/transport/services/staff.models';

const DRIVER: DriverResponse = {
  id: 1, providerId: 101, name: 'Ravi Kumar', licenseNumber: 'KA-DL-001', phone: '9000000002', email: null,
  status: 'AVAILABLE', totalTrips: 12, totalDistanceKm: 4300, rating: 4.6, active: true, createdAt: '2026-01-01T00:00:00',
};

describe('DriverService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return { service: TestBed.inject(DriverService), httpMock: TestBed.inject(HttpTestingController) };
  }

  it('lists drivers with no providerId query param', async () => {
    const { service, httpMock } = await setup();
    const promise = service.listDrivers();
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/operations/drivers');
    expect(req.request.params.has('providerId')).toBe(false);
    req.flush({ success: true, data: [DRIVER], message: null, error: null });
    expect(await promise).toEqual([DRIVER]);
  });

  it('creates a driver without a status field and with the providerId placeholder', async () => {
    const { service, httpMock } = await setup();
    const promise = service.createDriver({ name: 'Ravi Kumar', licenseNumber: 'KA-DL-001', phone: '9000000002' });
    const req = httpMock.expectOne('http://localhost:8080/api/operations/drivers');
    expect(req.request.body.status).toBeUndefined();
    expect(req.request.body.providerId).toBe(0);
    req.flush({ success: true, data: DRIVER, message: null, error: null });
    expect(await promise).toEqual(DRIVER);
  });

  it('updates a driver with name/phone/email/status but not licenseNumber', async () => {
    const { service, httpMock } = await setup();
    const promise = service.updateDriver(1, { name: 'Ravi Kumar', phone: '9000000002', status: 'OFF_DUTY' });
    const req = httpMock.expectOne('http://localhost:8080/api/operations/drivers/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.licenseNumber).toBeUndefined();
    req.flush({ success: true, data: { ...DRIVER, status: 'OFF_DUTY' }, message: null, error: null });
    expect((await promise).status).toBe('OFF_DUTY');
  });

  it('deactivates a driver via DELETE', async () => {
    const { service, httpMock } = await setup();
    const promise = service.deactivateDriver(1);
    const req = httpMock.expectOne('http://localhost:8080/api/operations/drivers/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, data: { message: 'ok' }, message: null, error: null });
    await promise;
  });
});
```

Create the analogous `frontend/src/app/features/transport/services/conductor.service.spec.ts` mirroring every test above against `ConductorService`/`/api/operations/conductors`, substituting `employeeId` for `licenseNumber` and dropping `totalDistanceKm`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/app/features/transport/services/driver.service.spec.ts src/app/features/transport/services/conductor.service.spec.ts`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Implement models**

Create `frontend/src/app/features/transport/services/staff.models.ts`:

```typescript
import { ConductorStatus, DriverStatus } from '@app/features/transport/services/transport-enums';

export interface DriverResponse {
  id: number;
  providerId: number;
  name: string;
  licenseNumber: string;
  phone: string | null;
  email: string | null;
  status: DriverStatus;
  totalTrips: number;
  totalDistanceKm: number;
  rating: number;
  active: boolean;
  createdAt: string;
}

export interface ConductorResponse {
  id: number;
  providerId: number;
  name: string;
  employeeId: string;
  phone: string | null;
  email: string | null;
  status: ConductorStatus;
  totalTrips: number;
  rating: number;
  active: boolean;
  createdAt: string;
}

/** Create form: no status field — the backend never maps it on create. */
export interface DriverCreatePayload {
  name: string;
  licenseNumber: string;
  phone?: string;
  email?: string;
}

/** Edit form: no licenseNumber — updateDriver never touches it. */
export interface DriverEditPayload {
  name: string;
  phone?: string;
  email?: string;
  status: DriverStatus;
}

export interface ConductorCreatePayload {
  name: string;
  employeeId: string;
  phone?: string;
  email?: string;
}

export interface ConductorEditPayload {
  name: string;
  phone?: string;
  email?: string;
  status: ConductorStatus;
}
```

- [ ] **Step 4: Implement services**

Create `frontend/src/app/features/transport/services/driver.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  DriverCreatePayload, DriverEditPayload, DriverResponse,
} from '@app/features/transport/services/staff.models';

/** DriverRequest.providerId is @NotNull but always server-overwritten (Category 5). */
const PROVIDER_ID_PLACEHOLDER = 0;

@Injectable({ providedIn: 'root' })
export class DriverService {
  private readonly http = inject(HttpClient);

  listDrivers(): Observable<DriverResponse[]> {
    return this.http
      .get<ApiResponse<DriverResponse[]>>(`${API_BASE_URL}/api/operations/drivers`)
      .pipe(map((response) => response.data));
  }

  createDriver(payload: DriverCreatePayload): Observable<DriverResponse> {
    return this.http
      .post<ApiResponse<DriverResponse>>(`${API_BASE_URL}/api/operations/drivers`, {
        ...payload,
        providerId: PROVIDER_ID_PLACEHOLDER,
      })
      .pipe(map((response) => response.data));
  }

  updateDriver(id: number, payload: DriverEditPayload): Observable<DriverResponse> {
    return this.http
      .put<ApiResponse<DriverResponse>>(`${API_BASE_URL}/api/operations/drivers/${id}`, {
        ...payload,
        providerId: PROVIDER_ID_PLACEHOLDER,
      })
      .pipe(map((response) => response.data));
  }

  deactivateDriver(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<{ message: string }>>(`${API_BASE_URL}/api/operations/drivers/${id}`)
      .pipe(map(() => undefined));
  }
}
```

Create `frontend/src/app/features/transport/services/conductor.service.ts` mirroring the same structure exactly, substituting `ConductorResponse`/`ConductorCreatePayload`/`ConductorEditPayload` and the `/api/operations/conductors` path:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  ConductorCreatePayload, ConductorEditPayload, ConductorResponse,
} from '@app/features/transport/services/staff.models';

const PROVIDER_ID_PLACEHOLDER = 0;

@Injectable({ providedIn: 'root' })
export class ConductorService {
  private readonly http = inject(HttpClient);

  listConductors(): Observable<ConductorResponse[]> {
    return this.http
      .get<ApiResponse<ConductorResponse[]>>(`${API_BASE_URL}/api/operations/conductors`)
      .pipe(map((response) => response.data));
  }

  createConductor(payload: ConductorCreatePayload): Observable<ConductorResponse> {
    return this.http
      .post<ApiResponse<ConductorResponse>>(`${API_BASE_URL}/api/operations/conductors`, {
        ...payload,
        providerId: PROVIDER_ID_PLACEHOLDER,
      })
      .pipe(map((response) => response.data));
  }

  updateConductor(id: number, payload: ConductorEditPayload): Observable<ConductorResponse> {
    return this.http
      .put<ApiResponse<ConductorResponse>>(`${API_BASE_URL}/api/operations/conductors/${id}`, {
        ...payload,
        providerId: PROVIDER_ID_PLACEHOLDER,
      })
      .pipe(map((response) => response.data));
  }

  deactivateConductor(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<{ message: string }>>(`${API_BASE_URL}/api/operations/conductors/${id}`)
      .pipe(map(() => undefined));
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/app/features/transport/services/driver.service.spec.ts src/app/features/transport/services/conductor.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/transport/services/staff.models.ts frontend/src/app/features/transport/services/driver.service.ts frontend/src/app/features/transport/services/driver.service.spec.ts frontend/src/app/features/transport/services/conductor.service.ts frontend/src/app/features/transport/services/conductor.service.spec.ts
git commit -m "feat(transport): add Driver and Conductor models and services"
```

---

### Task 12: Staff page (new) — Drivers/Conductors tabs, deactivate action, nav wiring

**Files:**
- Create: `frontend/src/app/features/transport/components/staff-management/staff-management.ts`
- Create: `frontend/src/app/features/transport/components/staff-management/staff-management.html`
- Create: `frontend/src/app/features/transport/components/staff-management/staff-management.spec.ts`
- Modify: `frontend/src/app/features/transport/transport.routes.ts` (add `staff` child)
- Modify: `frontend/src/app/shared/layout/app-shell/app-shell.ts` (add `Staff` nav entry to `NAV_MAP.transport`)
- Inspect before editing: `frontend/src/app/features/transport/transport.routes.ts` (current 5-child structure), `frontend/src/app/shared/layout/app-shell/app-shell.ts:38-44` (`NAV_MAP.transport` array).

**Active field:** read-only badge — `active: boolean` rendered as an `Active`/`Inactive` badge, never a toggle. No reactivation endpoint exists. "Deactivate" row action is **disabled once `active === false`** (avoids a misleading no-op — calling `DELETE` again would still succeed but silently reset `status` to `OFF_DUTY` again, which would misrepresent the action as doing something new).

**Status editing:** no formal transition graph for Driver/Conductor (confirmed: `updateDriver`/`updateConductor` do an unconditional `if (status != null && status != current) set(status)`). Edit form's status select lists all 5 values from `DRIVER_STATUSES`/`CONDUCTOR_STATUSES` (Task 4) unrestricted — not modeled as a state machine.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/features/transport/components/staff-management/staff-management.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { StaffManagement } from '@app/features/transport/components/staff-management/staff-management';
import { DriverService } from '@app/features/transport/services/driver.service';
import { ConductorService } from '@app/features/transport/services/conductor.service';
import { ToastService } from '@app/core/toast/toast.service';
import { DriverResponse } from '@app/features/transport/services/staff.models';

const ACTIVE_DRIVER: DriverResponse = {
  id: 1, providerId: 101, name: 'Ravi Kumar', licenseNumber: 'KA-DL-001', phone: null, email: null,
  status: 'AVAILABLE', totalTrips: 12, totalDistanceKm: 4300, rating: 4.6, active: true, createdAt: '2026-01-01T00:00:00',
};
const INACTIVE_DRIVER: DriverResponse = { ...ACTIVE_DRIVER, id: 2, active: false, status: 'OFF_DUTY' };

async function setup(driverService: Partial<DriverService>, conductorService: Partial<ConductorService> = {}) {
  await TestBed.configureTestingModule({
    imports: [StaffManagement],
    providers: [
      { provide: DriverService, useValue: driverService },
      { provide: ConductorService, useValue: { listConductors: () => of([]), ...conductorService } },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(StaffManagement);
  fixture.detectChanges();
  return { fixture };
}

describe('StaffManagement', () => {
  it('loads drivers and conductors on init', async () => {
    const { fixture } = await setup({ listDrivers: () => of([ACTIVE_DRIVER]) });
    expect(fixture.componentInstance.drivers()).toEqual([ACTIVE_DRIVER]);
  });

  it('marks deactivate as disabled for an already-inactive driver', async () => {
    const { fixture } = await setup({ listDrivers: () => of([ACTIVE_DRIVER, INACTIVE_DRIVER]) });
    expect(fixture.componentInstance.canDeactivate(ACTIVE_DRIVER)).toBe(true);
    expect(fixture.componentInstance.canDeactivate(INACTIVE_DRIVER)).toBe(false);
  });

  it('surfaces a read error inline without throwing', async () => {
    const { fixture } = await setup({
      listDrivers: () => throwError(() => new HttpErrorResponse({ status: 500 })),
    });
    expect(fixture.componentInstance.driversError()).toBe('Failed to load drivers.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/app/features/transport/components/staff-management/staff-management.spec.ts`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the component**

Create `frontend/src/app/features/transport/components/staff-management/staff-management.ts`:

```typescript
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { ToastService } from '@app/core/toast/toast.service';
import { DriverService } from '@app/features/transport/services/driver.service';
import { ConductorService } from '@app/features/transport/services/conductor.service';
import { DRIVER_STATUSES, CONDUCTOR_STATUSES } from '@app/features/transport/services/transport-enums';
import {
  ConductorCreatePayload, ConductorEditPayload, ConductorResponse,
  DriverCreatePayload, DriverEditPayload, DriverResponse,
} from '@app/features/transport/services/staff.models';

@Component({
  selector: 'app-staff-management',
  imports: [
    NgIcon, HlmCardImports, HlmButtonImports, HlmTabsImports, HlmTableImports,
    HlmSheetImports, HlmInputImports, HlmSelectImports, PageHeader,
  ],
  templateUrl: './staff-management.html',
})
export class StaffManagement {
  private readonly driverService = inject(DriverService);
  private readonly conductorService = inject(ConductorService);
  private readonly toastService = inject(ToastService);

  public readonly driverStatuses = DRIVER_STATUSES;
  public readonly conductorStatuses = CONDUCTOR_STATUSES;

  public readonly drivers = signal<DriverResponse[]>([]);
  public readonly driversLoading = signal(true);
  public readonly driversError = signal<string | null>(null);
  public readonly driverSheetOpen = signal(false);
  public readonly editingDriver = signal<DriverResponse | null>(null);

  public readonly conductors = signal<ConductorResponse[]>([]);
  public readonly conductorsLoading = signal(true);
  public readonly conductorsError = signal<string | null>(null);
  public readonly conductorSheetOpen = signal(false);
  public readonly editingConductor = signal<ConductorResponse | null>(null);

  constructor() {
    this.loadDrivers();
    this.loadConductors();
  }

  loadDrivers(): void {
    this.driversLoading.set(true);
    this.driversError.set(null);
    this.driverService.listDrivers().subscribe({
      next: (drivers) => { this.drivers.set(drivers); this.driversLoading.set(false); },
      error: () => { this.driversError.set('Failed to load drivers.'); this.driversLoading.set(false); },
    });
  }

  loadConductors(): void {
    this.conductorsLoading.set(true);
    this.conductorsError.set(null);
    this.conductorService.listConductors().subscribe({
      next: (conductors) => { this.conductors.set(conductors); this.conductorsLoading.set(false); },
      error: () => { this.conductorsError.set('Failed to load conductors.'); this.conductorsLoading.set(false); },
    });
  }

  canDeactivate(person: { active: boolean }): boolean {
    return person.active;
  }

  submitCreateDriver(payload: DriverCreatePayload): void {
    this.driverService.createDriver(payload).subscribe({
      next: () => { this.toastService.success('Driver added successfully.'); this.driverSheetOpen.set(false); this.loadDrivers(); },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to add driver.'),
    });
  }

  submitEditDriver(id: number, payload: DriverEditPayload): void {
    this.driverService.updateDriver(id, payload).subscribe({
      next: () => { this.toastService.success('Driver updated successfully.'); this.driverSheetOpen.set(false); this.loadDrivers(); },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to update driver.'),
    });
  }

  deactivateDriver(id: number): void {
    this.driverService.deactivateDriver(id).subscribe({
      next: () => { this.toastService.success('Driver deactivated.'); this.loadDrivers(); },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to deactivate driver.'),
    });
  }

  submitCreateConductor(payload: ConductorCreatePayload): void {
    this.conductorService.createConductor(payload).subscribe({
      next: () => { this.toastService.success('Conductor added successfully.'); this.conductorSheetOpen.set(false); this.loadConductors(); },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to add conductor.'),
    });
  }

  submitEditConductor(id: number, payload: ConductorEditPayload): void {
    this.conductorService.updateConductor(id, payload).subscribe({
      next: () => { this.toastService.success('Conductor updated successfully.'); this.conductorSheetOpen.set(false); this.loadConductors(); },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to update conductor.'),
    });
  }

  deactivateConductor(id: number): void {
    this.conductorService.deactivateConductor(id).subscribe({
      next: () => { this.toastService.success('Conductor deactivated.'); this.loadConductors(); },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to deactivate conductor.'),
    });
  }
}
```

Create `frontend/src/app/features/transport/components/staff-management/staff-management.html`:

```html
<app-page-header title="Staff" subtitle="Drivers and conductors for your fleet." />

<div hlmTabs tab="drivers">
  <div hlmTabsList aria-label="Staff sections">
    <button hlmTabsTrigger="drivers">Drivers</button>
    <button hlmTabsTrigger="conductors">Conductors</button>
  </div>

  <div hlmTabsContent="drivers">
    <div class="flex justify-end mb-4">
      <button hlmBtn (click)="editingDriver.set(null); driverSheetOpen.set(true)">
        <ng-icon name="lucidePlus" class="h-4 w-4 mr-1" />Add Driver
      </button>
    </div>
    @if (driversLoading()) {
      <p class="text-muted-foreground">Loading drivers…</p>
    } @else if (driversError()) {
      <div hlmCard class="p-6 text-center">
        <p class="text-destructive mb-4">{{ driversError() }}</p>
        <button class="text-sm underline text-primary" (click)="loadDrivers()">Retry</button>
      </div>
    } @else if (drivers().length === 0) {
      <p class="text-muted-foreground">No drivers yet.</p>
    } @else {
      <table hlmTable>
        <thead hlmTHead>
          <tr hlmTr>
            <th hlmTh>Name</th><th hlmTh>License</th><th hlmTh>Status</th>
            <th hlmTh>Trips</th><th hlmTh>Rating</th><th hlmTh>Active</th><th hlmTh></th>
          </tr>
        </thead>
        <tbody hlmTBody>
          @for (d of drivers(); track d.id) {
            <tr hlmTr>
              <td hlmTd>{{ d.name }}</td>
              <td hlmTd>{{ d.licenseNumber }}</td>
              <td hlmTd>{{ d.status }}</td>
              <td hlmTd>{{ d.totalTrips }}</td>
              <td hlmTd>{{ d.rating }}</td>
              <td hlmTd>{{ d.active ? 'Active' : 'Inactive' }}</td>
              <td hlmTd class="text-right space-x-2">
                <button hlmBtn variant="ghost" size="sm" (click)="editingDriver.set(d); driverSheetOpen.set(true)">Edit</button>
                <button hlmBtn variant="ghost" size="sm" class="text-destructive" [disabled]="!canDeactivate(d)" (click)="deactivateDriver(d.id)">Deactivate</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  </div>

  <div hlmTabsContent="conductors">
    <div class="flex justify-end mb-4">
      <button hlmBtn (click)="editingConductor.set(null); conductorSheetOpen.set(true)">
        <ng-icon name="lucidePlus" class="h-4 w-4 mr-1" />Add Conductor
      </button>
    </div>
    @if (conductorsLoading()) {
      <p class="text-muted-foreground">Loading conductors…</p>
    } @else if (conductorsError()) {
      <div hlmCard class="p-6 text-center">
        <p class="text-destructive mb-4">{{ conductorsError() }}</p>
        <button class="text-sm underline text-primary" (click)="loadConductors()">Retry</button>
      </div>
    } @else if (conductors().length === 0) {
      <p class="text-muted-foreground">No conductors yet.</p>
    } @else {
      <table hlmTable>
        <thead hlmTHead>
          <tr hlmTr>
            <th hlmTh>Name</th><th hlmTh>Employee ID</th><th hlmTh>Status</th>
            <th hlmTh>Trips</th><th hlmTh>Rating</th><th hlmTh>Active</th><th hlmTh></th>
          </tr>
        </thead>
        <tbody hlmTBody>
          @for (c of conductors(); track c.id) {
            <tr hlmTr>
              <td hlmTd>{{ c.name }}</td>
              <td hlmTd>{{ c.employeeId }}</td>
              <td hlmTd>{{ c.status }}</td>
              <td hlmTd>{{ c.totalTrips }}</td>
              <td hlmTd>{{ c.rating }}</td>
              <td hlmTd>{{ c.active ? 'Active' : 'Inactive' }}</td>
              <td hlmTd class="text-right space-x-2">
                <button hlmBtn variant="ghost" size="sm" (click)="editingConductor.set(c); conductorSheetOpen.set(true)">Edit</button>
                <button hlmBtn variant="ghost" size="sm" class="text-destructive" [disabled]="!canDeactivate(c)" (click)="deactivateConductor(c.id)">Deactivate</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  </div>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/app/features/transport/components/staff-management/staff-management.spec.ts`
Expected: PASS.

- [ ] **Step 5: Wire the `staff` route and nav entry**

In `frontend/src/app/features/transport/transport.routes.ts`, add a new child after `'vehicles'`:
```typescript
      {
        path: 'staff',
        loadComponent: () =>
          import('@app/features/transport/components/staff-management/staff-management').then(
            (m) => m.StaffManagement,
          ),
      },
```

In `frontend/src/app/shared/layout/app-shell/app-shell.ts`, in `NAV_MAP.transport`, add after the `'/transport/vehicles'` entry:
```typescript
    { to: '/transport/staff', label: 'Staff', icon: 'lucideUsers' },
```

- [ ] **Step 6: Run the full transport route/nav spec suite to confirm no regression**

Run: `cd frontend && npx vitest run src/app/features/transport src/app/shared/layout/app-shell`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/features/transport/components/staff-management/ frontend/src/app/features/transport/transport.routes.ts frontend/src/app/shared/layout/app-shell/app-shell.ts
git commit -m "feat(transport): add Staff page with Drivers/Conductors tabs and wire nav/route"
```

**Phase 4 exit check:** `cd frontend && npx vitest run src/app/features/transport/services/driver.service.spec.ts src/app/features/transport/services/conductor.service.spec.ts src/app/features/transport/components/staff-management` — all green.

---

## Phase 5: Schedules

### Task 13: Route (read-only) + Schedule models and services

**Files:**
- Create: `frontend/src/app/features/transport/services/route-reference.models.ts`
- Create: `frontend/src/app/features/transport/services/route-reference.service.ts`
- Create: `frontend/src/app/features/transport/services/route-reference.service.spec.ts`
- Create: `frontend/src/app/features/transport/services/schedule.models.ts`
- Create: `frontend/src/app/features/transport/services/schedule.service.ts`
- Create: `frontend/src/app/features/transport/services/schedule.service.spec.ts`

**Route endpoint** (`RouteController`) — **admin-owned, read-only reference data.** `POST/PUT/DELETE /api/routes` are `hasRole('ADMIN')` only; the Transport Provider frontend only ever calls `GET /api/routes?status=ACTIVE`. No create/edit/delete for routes anywhere in this feature.
**Route response**: `{ id, source, destination, distanceKm, durationHours, status: RouteStatus, createdAt }`.

**Schedule endpoints** (`ScheduleController`):
- `GET /api/schedules` — **backend limitation: no scoping mechanism exists at all** (no `providerId`/`status`/`busId` param, no role restriction, returns every provider's schedules unfiltered). Frontend fetches everything and applies a **client-side display filter**: `schedule.bus.providerId === StoredUser.providerId`. This is explicitly a UI filter, not an authorization boundary — backend mutation ownership (`assertOwnsSchedule`/`assertOwnsBus`) remains authoritative regardless.
- `POST /api/schedules` — `hasAnyRole('ADMIN','PROVIDER')`, `assertOwnsBus(request.getBusId())`. `ensureAssignable` requires the selected Bus `ACTIVE` and Route `ACTIVE` or throws `IllegalStateException`.
- `PUT /api/schedules/{id}` — `assertOwnsSchedule(id)` + `assertOwnsBus(request.getBusId())`, same `ensureAssignable` check. **Unconditionally resets `availableSeats` to the bus's full `totalSeats`** on every edit, no lifecycle guard.
- `DELETE /api/schedules/{id}` — really "cancel": sets `status = CANCELLED`, no hard delete, `assertOwnsSchedule(id)`.
- **No PATCH/transition endpoint exists for Schedule status at all** — `DEPARTED`/`ARRIVED` are never reachable through this controller; status is read-only in the UI.

**Request DTO** (`ScheduleRequest`): `{ busId: number (@NotNull), routeId: number (@NotNull), travelDate: string (@NotNull), departureTime: string (@NotNull), arrivalTime: string (@NotNull), fare: number (@NotNull) }` — no `providerId` field at all.
**Response DTO** (`ScheduleResponse`): `{ id, bus: BusResponse, route: RouteResponse, travelDate, departureTime, arrivalTime, fare: number, availableSeats: number, status: ScheduleStatus }`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/app/features/transport/services/route-reference.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RouteReferenceService } from '@app/features/transport/services/route-reference.service';
import { RouteReferenceResponse } from '@app/features/transport/services/route-reference.models';

const ROUTE: RouteReferenceResponse = {
  id: 1, source: 'Bengaluru', destination: 'Goa', distanceKm: 560, durationHours: 10, status: 'ACTIVE', createdAt: '2026-01-01T00:00:00',
};

describe('RouteReferenceService', () => {
  it('lists only ACTIVE admin-owned routes as read-only reference data', async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const service = TestBed.inject(RouteReferenceService);
    const httpMock = TestBed.inject(HttpTestingController);

    const promise = service.listActiveRoutes();
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/routes');
    expect(req.request.params.get('status')).toBe('ACTIVE');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [ROUTE], message: null, error: null });
    expect(await promise).toEqual([ROUTE]);
  });
});
```

Note: `RouteReferenceService` intentionally has **no** `createRoute`/`updateRoute`/`deleteRoute` methods — Route is admin-only reference data for this feature; there is no test for those because there is no such method.

Create `frontend/src/app/features/transport/services/schedule.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ScheduleService } from '@app/features/transport/services/schedule.service';
import { ScheduleResponse } from '@app/features/transport/services/schedule.models';
import { BusResponse } from '@app/features/transport/services/bus.models';
import { RouteReferenceResponse } from '@app/features/transport/services/route-reference.models';

const BUS: BusResponse = {
  id: 1, busNumber: 'KA-01-AB-1234', busName: 'Volvo', totalSeats: 40, providerId: 101,
  busType: 'AC_SLEEPER', amenities: [], status: 'ACTIVE', createdAt: '2026-01-01T00:00:00',
};
const OTHER_PROVIDER_BUS: BusResponse = { ...BUS, id: 2, providerId: 202 };
const ROUTE: RouteReferenceResponse = {
  id: 1, source: 'Bengaluru', destination: 'Goa', distanceKm: 560, durationHours: 10, status: 'ACTIVE', createdAt: '2026-01-01T00:00:00',
};
const SCHEDULE_MINE: ScheduleResponse = {
  id: 1, bus: BUS, route: ROUTE, travelDate: '2026-08-01', departureTime: '20:00', arrivalTime: '06:00',
  fare: 1200, availableSeats: 40, status: 'SCHEDULED',
};
const SCHEDULE_OTHER: ScheduleResponse = { ...SCHEDULE_MINE, id: 2, bus: OTHER_PROVIDER_BUS };

describe('ScheduleService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return { service: TestBed.inject(ScheduleService), httpMock: TestBed.inject(HttpTestingController) };
  }

  it('fetches all schedules (no server-side scoping exists) and filters client-side by providerId', async () => {
    const { service, httpMock } = await setup();
    const promise = service.listMySchedules(101);
    const req = httpMock.expectOne('http://localhost:8080/api/schedules');
    expect(req.request.params.keys().length).toBe(0);
    req.flush({ success: true, data: [SCHEDULE_MINE, SCHEDULE_OTHER], message: null, error: null });
    expect(await promise).toEqual([SCHEDULE_MINE]);
  });

  it('creates a schedule with only busId/routeId/travelDate/departureTime/arrivalTime/fare', async () => {
    const { service, httpMock } = await setup();
    const promise = service.createSchedule({
      busId: 1, routeId: 1, travelDate: '2026-08-01', departureTime: '20:00', arrivalTime: '06:00', fare: 1200,
    });
    const req = httpMock.expectOne('http://localhost:8080/api/schedules');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.providerId).toBeUndefined();
    req.flush({ success: true, data: SCHEDULE_MINE, message: null, error: null });
    expect(await promise).toEqual(SCHEDULE_MINE);
  });

  it('cancels a schedule via DELETE (the only lifecycle action available)', async () => {
    const { service, httpMock } = await setup();
    const promise = service.cancelSchedule(1);
    const req = httpMock.expectOne('http://localhost:8080/api/schedules/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, data: { message: 'Schedule cancelled successfully' }, message: null, error: null });
    await promise;
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/app/features/transport/services/route-reference.service.spec.ts src/app/features/transport/services/schedule.service.spec.ts`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Implement Route reference models + service**

Create `frontend/src/app/features/transport/services/route-reference.models.ts`:

```typescript
import { RouteStatus } from '@app/features/transport/services/transport-enums';

export interface RouteReferenceResponse {
  id: number;
  source: string;
  destination: string;
  distanceKm: number | null;
  durationHours: number | null;
  status: RouteStatus;
  createdAt: string;
}
```

Create `frontend/src/app/features/transport/services/route-reference.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import { RouteReferenceResponse } from '@app/features/transport/services/route-reference.models';

/**
 * Route is admin-owned master reference data — POST/PUT/DELETE /api/routes
 * are hasRole('ADMIN') only. This service is intentionally read-only.
 */
@Injectable({ providedIn: 'root' })
export class RouteReferenceService {
  private readonly http = inject(HttpClient);

  listActiveRoutes(): Observable<RouteReferenceResponse[]> {
    const params = new HttpParams().set('status', 'ACTIVE');
    return this.http
      .get<ApiResponse<RouteReferenceResponse[]>>(`${API_BASE_URL}/api/routes`, { params })
      .pipe(map((response) => response.data));
  }
}
```

- [ ] **Step 4: Implement Schedule models + service**

Create `frontend/src/app/features/transport/services/schedule.models.ts`:

```typescript
import { ScheduleStatus } from '@app/features/transport/services/transport-enums';
import { BusResponse } from '@app/features/transport/services/bus.models';
import { RouteReferenceResponse } from '@app/features/transport/services/route-reference.models';

export interface ScheduleResponse {
  id: number;
  bus: BusResponse;
  route: RouteReferenceResponse;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
  fare: number;
  availableSeats: number;
  status: ScheduleStatus;
}

export interface ScheduleFormPayload {
  busId: number;
  routeId: number;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
  fare: number;
}
```

Create `frontend/src/app/features/transport/services/schedule.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import { ScheduleFormPayload, ScheduleResponse } from '@app/features/transport/services/schedule.models';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly http = inject(HttpClient);

  /**
   * GET /api/schedules has no server-side scoping mechanism at all (no
   * providerId/status/busId param, no role restriction) — it returns every
   * provider's schedules. This method applies a client-side display filter
   * only; it is not an authorization boundary. Backend mutation ownership
   * (assertOwnsSchedule/assertOwnsBus) remains authoritative.
   */
  listMySchedules(providerId: number): Observable<ScheduleResponse[]> {
    return this.http
      .get<ApiResponse<ScheduleResponse[]>>(`${API_BASE_URL}/api/schedules`)
      .pipe(map((response) => response.data.filter((s) => s.bus.providerId === providerId)));
  }

  createSchedule(payload: ScheduleFormPayload): Observable<ScheduleResponse> {
    return this.http
      .post<ApiResponse<ScheduleResponse>>(`${API_BASE_URL}/api/schedules`, payload)
      .pipe(map((response) => response.data));
  }

  updateSchedule(id: number, payload: ScheduleFormPayload): Observable<ScheduleResponse> {
    return this.http
      .put<ApiResponse<ScheduleResponse>>(`${API_BASE_URL}/api/schedules/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  cancelSchedule(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<{ message: string }>>(`${API_BASE_URL}/api/schedules/${id}`)
      .pipe(map(() => undefined));
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/app/features/transport/services/route-reference.service.spec.ts src/app/features/transport/services/schedule.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/transport/services/route-reference.models.ts frontend/src/app/features/transport/services/route-reference.service.ts frontend/src/app/features/transport/services/route-reference.service.spec.ts frontend/src/app/features/transport/services/schedule.models.ts frontend/src/app/features/transport/services/schedule.service.ts frontend/src/app/features/transport/services/schedule.service.spec.ts
git commit -m "feat(transport): add read-only Route reference and Schedule models/services"
```

---

### Task 14: Rename `manage-routes` → `manage-schedules`, path `routes` → `schedules`, nav update

**Files:**
- Create: `frontend/src/app/features/transport/components/manage-schedules/manage-schedules.ts`
- Create: `frontend/src/app/features/transport/components/manage-schedules/manage-schedules.html`
- Create: `frontend/src/app/features/transport/components/manage-schedules/manage-schedules.spec.ts`
- Delete: `frontend/src/app/features/transport/components/manage-routes/manage-routes.ts`, `manage-routes.html` (and any existing spec) — business meaning changed (Route → Schedule), matching the already-approved justified-rename precedent.
- Modify: `frontend/src/app/features/transport/transport.routes.ts` (child path `'routes'` → `'schedules'`, component import updated)
- Modify: `frontend/src/app/shared/layout/app-shell/app-shell.ts` (`NAV_MAP.transport`: `{ to: '/transport/routes', label: 'Routes', ... }` → `{ to: '/transport/schedules', label: 'Schedules', icon: 'lucideCalendarClock' }`)
- Inspect before editing: current `manage-routes.ts`/`.html` (dummy — reads `partnerRoutes` mock array into a static occupancy table).

**Route select:** `RouteReferenceService.listActiveRoutes()` (admin's `ACTIVE` routes only, read-only display of source→destination/distance/duration).
**Bus select:** reuses `BusService.listBuses(providerId)` filtered client-side to `status === 'ACTIVE'` (matches `ensureAssignable`'s server-side requirement, avoiding a foreseeable rejected submit).
**Status:** read-only badge (`SCHEDULED | DEPARTED | ARRIVED | CANCELLED`) — no PATCH endpoint exists. Only lifecycle action is **Cancel**, disabled once already `CANCELLED`.
**Edit caution:** editing resets `availableSeats` to the bus's full capacity — surfaced as a caution banner in the edit Sheet, not corrected.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/features/transport/components/manage-schedules/manage-schedules.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ManageSchedules } from '@app/features/transport/components/manage-schedules/manage-schedules';
import { ScheduleService } from '@app/features/transport/services/schedule.service';
import { RouteReferenceService } from '@app/features/transport/services/route-reference.service';
import { BusService } from '@app/features/transport/services/bus.service';
import { AuthService } from '@app/core/auth/auth.service';
import { ToastService } from '@app/core/toast/toast.service';
import { ScheduleResponse } from '@app/features/transport/services/schedule.models';

const SCHEDULED: ScheduleResponse = {
  id: 1,
  bus: { id: 1, busNumber: 'KA-01-AB-1234', busName: 'Volvo', totalSeats: 40, providerId: 101, busType: 'AC_SLEEPER', amenities: [], status: 'ACTIVE', createdAt: '' },
  route: { id: 1, source: 'Bengaluru', destination: 'Goa', distanceKm: 560, durationHours: 10, status: 'ACTIVE', createdAt: '' },
  travelDate: '2026-08-01', departureTime: '20:00', arrivalTime: '06:00', fare: 1200, availableSeats: 40, status: 'SCHEDULED',
};
const CANCELLED: ScheduleResponse = { ...SCHEDULED, id: 2, status: 'CANCELLED' };

async function setup(scheduleService: Partial<ScheduleService>) {
  await TestBed.configureTestingModule({
    imports: [ManageSchedules],
    providers: [
      { provide: ScheduleService, useValue: scheduleService },
      { provide: RouteReferenceService, useValue: { listActiveRoutes: () => of([]) } },
      { provide: BusService, useValue: { listBuses: () => of([]) } },
      { provide: AuthService, useValue: { currentUser: () => ({ providerId: 101 }) } },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ManageSchedules);
  fixture.detectChanges();
  return { fixture };
}

describe('ManageSchedules', () => {
  it('loads the caller\'s own schedules via the client-side providerId filter', async () => {
    const { fixture } = await setup({ listMySchedules: () => of([SCHEDULED]) });
    expect(fixture.componentInstance.schedules()).toEqual([SCHEDULED]);
  });

  it('disables Cancel for an already-cancelled schedule', async () => {
    const { fixture } = await setup({ listMySchedules: () => of([SCHEDULED, CANCELLED]) });
    expect(fixture.componentInstance.canCancel(SCHEDULED)).toBe(true);
    expect(fixture.componentInstance.canCancel(CANCELLED)).toBe(false);
  });

  it('surfaces a read error inline without throwing', async () => {
    const { fixture } = await setup({
      listMySchedules: () => throwError(() => new HttpErrorResponse({ status: 500 })),
    });
    expect(fixture.componentInstance.error()).toBe('Failed to load schedules.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/app/features/transport/components/manage-schedules/manage-schedules.spec.ts`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the component**

Create `frontend/src/app/features/transport/components/manage-schedules/manage-schedules.ts`:

```typescript
import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { AuthService } from '@app/core/auth/auth.service';
import { ToastService } from '@app/core/toast/toast.service';
import { ScheduleService } from '@app/features/transport/services/schedule.service';
import { RouteReferenceService } from '@app/features/transport/services/route-reference.service';
import { BusService } from '@app/features/transport/services/bus.service';
import { ScheduleFormPayload, ScheduleResponse } from '@app/features/transport/services/schedule.models';
import { RouteReferenceResponse } from '@app/features/transport/services/route-reference.models';
import { BusResponse } from '@app/features/transport/services/bus.models';

@Component({
  selector: 'app-manage-schedules',
  imports: [
    NgIcon, HlmCardImports, HlmButtonImports, HlmTableImports, HlmSheetImports,
    HlmSelectImports, HlmInputImports, PageHeader, StatusBadge,
  ],
  templateUrl: './manage-schedules.html',
})
export class ManageSchedules {
  private readonly scheduleService = inject(ScheduleService);
  private readonly routeReferenceService = inject(RouteReferenceService);
  private readonly busService = inject(BusService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  public readonly schedules = signal<ScheduleResponse[]>([]);
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  public readonly sheetOpen = signal(false);
  public readonly editingSchedule = signal<ScheduleResponse | null>(null);

  public readonly activeRoutes = signal<RouteReferenceResponse[]>([]);
  private readonly allBuses = signal<BusResponse[]>([]);
  public readonly activeBuses = computed(() => this.allBuses().filter((b) => b.status === 'ACTIVE'));

  constructor() {
    this.load();
    this.routeReferenceService.listActiveRoutes().subscribe((routes) => this.activeRoutes.set(routes));
    const providerId = this.authService.currentUser()?.providerId;
    if (providerId != null) {
      this.busService.listBuses(providerId).subscribe((buses) => this.allBuses.set(buses));
    }
  }

  load(): void {
    const providerId = this.authService.currentUser()?.providerId;
    if (providerId == null) {
      this.error.set('No provider account found for the current session.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.scheduleService.listMySchedules(providerId).subscribe({
      next: (schedules) => { this.schedules.set(schedules); this.loading.set(false); },
      error: () => { this.error.set('Failed to load schedules.'); this.loading.set(false); },
    });
  }

  canCancel(schedule: ScheduleResponse): boolean {
    return schedule.status !== 'CANCELLED';
  }

  submitCreate(payload: ScheduleFormPayload): void {
    this.scheduleService.createSchedule(payload).subscribe({
      next: () => { this.toastService.success('Schedule created successfully.'); this.sheetOpen.set(false); this.load(); },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to create schedule.'),
    });
  }

  submitEdit(id: number, payload: ScheduleFormPayload): void {
    this.scheduleService.updateSchedule(id, payload).subscribe({
      next: () => { this.toastService.success('Schedule updated successfully.'); this.sheetOpen.set(false); this.load(); },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to update schedule.'),
    });
  }

  cancelSchedule(id: number): void {
    this.scheduleService.cancelSchedule(id).subscribe({
      next: () => { this.toastService.success('Schedule cancelled.'); this.load(); },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to cancel schedule.'),
    });
  }
}
```

Create `frontend/src/app/features/transport/components/manage-schedules/manage-schedules.html`:

```html
<app-page-header title="Schedules" subtitle="Bookable trips across your fleet and admin-managed routes.">
  <button hlmBtn action (click)="editingSchedule.set(null); sheetOpen.set(true)">
    <ng-icon name="lucidePlus" class="h-4 w-4 mr-1" />Add Schedule
  </button>
</app-page-header>

@if (loading()) {
  <p class="text-muted-foreground">Loading schedules…</p>
} @else if (error()) {
  <div hlmCard class="p-6 text-center">
    <p class="text-destructive mb-4">{{ error() }}</p>
    <button class="text-sm underline text-primary" (click)="load()">Retry</button>
  </div>
} @else if (schedules().length === 0) {
  <p class="text-muted-foreground">No schedules yet. Add one against one of your active buses.</p>
} @else {
  <table hlmTable>
    <thead hlmTHead>
      <tr hlmTr>
        <th hlmTh>Route</th><th hlmTh>Bus</th><th hlmTh>Travel Date</th><th hlmTh>Departure</th>
        <th hlmTh>Arrival</th><th hlmTh>Fare</th><th hlmTh>Seats</th><th hlmTh>Status</th><th hlmTh></th>
      </tr>
    </thead>
    <tbody hlmTBody>
      @for (s of schedules(); track s.id) {
        <tr hlmTr>
          <td hlmTd>{{ s.route.source }} → {{ s.route.destination }}</td>
          <td hlmTd>{{ s.bus.busNumber }}</td>
          <td hlmTd>{{ s.travelDate }}</td>
          <td hlmTd>{{ s.departureTime }}</td>
          <td hlmTd>{{ s.arrivalTime }}</td>
          <td hlmTd>₹{{ s.fare }}</td>
          <td hlmTd>{{ s.availableSeats }}</td>
          <td hlmTd><app-status-badge [status]="s.status" /></td>
          <td hlmTd class="text-right space-x-2">
            <button hlmBtn variant="ghost" size="sm" (click)="editingSchedule.set(s); sheetOpen.set(true)">Edit</button>
            <button hlmBtn variant="ghost" size="sm" class="text-destructive" [disabled]="!canCancel(s)" (click)="cancelSchedule(s.id)">Cancel</button>
          </td>
        </tr>
      }
    </tbody>
  </table>
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/app/features/transport/components/manage-schedules/manage-schedules.spec.ts`
Expected: PASS.

- [ ] **Step 5: Delete the obsolete `manage-routes` component and rewire the route/nav**

Delete `frontend/src/app/features/transport/components/manage-routes/manage-routes.ts` and `manage-routes.html` (no test file currently exists for it).

In `frontend/src/app/features/transport/transport.routes.ts`, change the `'routes'` child:
```typescript
      {
        path: 'routes',
        loadComponent: () =>
          import('@app/features/transport/components/manage-routes/manage-routes').then(
            (m) => m.ManageRoutes,
          ),
      },
```
to:
```typescript
      {
        path: 'schedules',
        loadComponent: () =>
          import('@app/features/transport/components/manage-schedules/manage-schedules').then(
            (m) => m.ManageSchedules,
          ),
      },
```

In `frontend/src/app/shared/layout/app-shell/app-shell.ts`, in `NAV_MAP.transport`, change:
```typescript
    { to: '/transport/routes', label: 'Routes', icon: 'lucideRoute' },
```
to:
```typescript
    { to: '/transport/schedules', label: 'Schedules', icon: 'lucideCalendarClock' },
```

- [ ] **Step 6: Run the full transport suite to confirm no regression**

Run: `cd frontend && npx vitest run src/app/features/transport src/app/shared/layout/app-shell`
Expected: PASS — no remaining reference to `ManageRoutes`/`manage-routes` anywhere (`npx tsc --noEmit` in the next step will catch any stray import).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/features/transport/components/manage-schedules/ frontend/src/app/features/transport/transport.routes.ts frontend/src/app/shared/layout/app-shell/app-shell.ts
git rm -r frontend/src/app/features/transport/components/manage-routes/
git commit -m "feat(transport): rename Manage Routes to Manage Schedules, path routes -> schedules"
```

**Phase 5 exit check:** `cd frontend && npx vitest run src/app/features/transport/services/route-reference.service.spec.ts src/app/features/transport/services/schedule.service.spec.ts src/app/features/transport/components/manage-schedules` — all green. `cd frontend && npx tsc --noEmit` — no dangling references to the deleted `manage-routes` module.

---

## Phase 6: Bus Trips

### Task 15: Trip models + service (list, assign crew, transition, fleet availability)

**Files:**
- Create: `frontend/src/app/features/transport/services/trip.models.ts`
- Create: `frontend/src/app/features/transport/services/trip.service.ts`
- Create: `frontend/src/app/features/transport/services/trip.service.spec.ts`

**Backend endpoints** (`FleetOperationController`) — Operational `Trip` (`busbooking.entity.Trip`), distinct from Schedule and unrelated to the traveler-facing `itinerary`/`trip` domain (out of scope):
- `GET /operations/trips?scheduleId&driverId&conductorId&status` — **Category 3, fully backend-scoped**: the controller applies its own ROLE_PROVIDER post-filter server-side (`t.getProviderId()`). No client-side filter needed here — the opposite situation from Schedules.
- `GET /operations/trips/{id}` — `assertOwnsTrip`.
- `POST /operations/trips/assign` — `assertOwnsSchedule(request.getScheduleId())`; service independently re-validates Driver/Conductor belong to the same provider and are `AVAILABLE`.
- `PATCH /operations/trips/{id}/status` — the formal transition graph (below).
- `GET /operations/fleet/availability/{providerId}` — **Category 4**: `providerId` is a required path segment, backend-verified via `resolveEffectiveProviderId` against the caller's identity. Frontend supplies `StoredUser.providerId` here specifically.

**Request DTOs**: `TripAssignmentRequest = { scheduleId: number (@NotNull), driverId?: number, conductorId?: number, notes?: string }` (Driver/Conductor optional — no frontend-invented required validation). `TripStatusTransitionRequest = { status: TripStatus (@NotNull), delayMinutes?: number, distanceCoveredKm?: number, reason?: string }`.
**Response DTOs**: `TripResponse = { id, scheduleId, routeId, providerId, busId, busNumber, busName, driverId?, driverName?, driverLicense?, conductorId?, conductorName?, status: TripStatus, actualDepartureTime?, actualArrivalTime?, delayMinutes: number, distanceCoveredKm: number, notes?, createdAt, updatedAt }`. `FleetAvailabilityResponse = { providerId, totalBuses, activeBuses, maintenanceBuses, inactiveBuses, availableDrivers, availableConductors, activeTrips, scheduledTrips }` (all counts as numbers).

**Lifecycle graph**, confirmed directly from `transitionTrip`'s switch-statement conditions:

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

Cancel is valid from every non-terminal state — the `CANCELLED` case only blocks `status == COMPLETED || status == CANCELLED`, no `ARRIVED` exclusion.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/app/features/transport/services/trip.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TripService } from '@app/features/transport/services/trip.service';
import { TripResponse } from '@app/features/transport/services/trip.models';

const TRIP: TripResponse = {
  id: 1, scheduleId: 1, routeId: 1, providerId: 101, busId: 1, busNumber: 'KA-01-AB-1234', busName: 'Volvo',
  driverId: null, driverName: null, driverLicense: null, conductorId: null, conductorName: null,
  status: 'SCHEDULED', actualDepartureTime: null, actualArrivalTime: null, delayMinutes: 0, distanceCoveredKm: 0,
  notes: null, createdAt: '2026-07-01T00:00:00', updatedAt: '2026-07-01T00:00:00',
};

describe('TripService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return { service: TestBed.inject(TripService), httpMock: TestBed.inject(HttpTestingController) };
  }

  it('lists trips with no client-side provider filter (already backend-scoped)', async () => {
    const { service, httpMock } = await setup();
    const promise = service.listTrips();
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/operations/trips');
    expect(req.request.params.has('providerId')).toBe(false);
    req.flush({ success: true, data: [TRIP], message: null, error: null });
    expect(await promise).toEqual([TRIP]);
  });

  it('assigns crew with driver/conductor left optional', async () => {
    const { service, httpMock } = await setup();
    const promise = service.assignTrip({ scheduleId: 1 });
    const req = httpMock.expectOne('http://localhost:8080/api/operations/trips/assign');
    expect(req.request.body).toEqual({ scheduleId: 1 });
    req.flush({ success: true, data: TRIP, message: null, error: null });
    expect(await promise).toEqual(TRIP);
  });

  it('transitions trip status via the exact PATCH path', async () => {
    const { service, httpMock } = await setup();
    const promise = service.transitionStatus(1, { status: 'BOARDING' });
    const req = httpMock.expectOne('http://localhost:8080/api/operations/trips/1/status');
    expect(req.request.method).toBe('PATCH');
    req.flush({ success: true, data: { ...TRIP, status: 'BOARDING' }, message: null, error: null });
    expect((await promise).status).toBe('BOARDING');
  });

  it('fetches fleet availability with providerId as a required path segment', async () => {
    const { service, httpMock } = await setup();
    const promise = service.getFleetAvailability(101);
    const req = httpMock.expectOne('http://localhost:8080/api/operations/fleet/availability/101');
    req.flush({
      success: true,
      data: { providerId: 101, totalBuses: 8, activeBuses: 6, maintenanceBuses: 2, inactiveBuses: 0, availableDrivers: 4, availableConductors: 4, activeTrips: 2, scheduledTrips: 3 },
      message: null, error: null,
    });
    expect((await promise).totalBuses).toBe(8);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/app/features/transport/services/trip.service.spec.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement models**

Create `frontend/src/app/features/transport/services/trip.models.ts`:

```typescript
import { TripStatus } from '@app/features/transport/services/transport-enums';

export interface TripResponse {
  id: number;
  scheduleId: number;
  routeId: number;
  providerId: number;
  busId: number;
  busNumber: string;
  busName: string;
  driverId: number | null;
  driverName: string | null;
  driverLicense: string | null;
  conductorId: number | null;
  conductorName: string | null;
  status: TripStatus;
  actualDepartureTime: string | null;
  actualArrivalTime: string | null;
  delayMinutes: number;
  distanceCoveredKm: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripAssignmentPayload {
  scheduleId: number;
  driverId?: number;
  conductorId?: number;
  notes?: string;
}

export interface TripTransitionPayload {
  status: TripStatus;
  delayMinutes?: number;
  distanceCoveredKm?: number;
  reason?: string;
}

export interface FleetAvailabilityResponse {
  providerId: number;
  totalBuses: number;
  activeBuses: number;
  maintenanceBuses: number;
  inactiveBuses: number;
  availableDrivers: number;
  availableConductors: number;
  activeTrips: number;
  scheduledTrips: number;
}
```

- [ ] **Step 4: Implement service**

Create `frontend/src/app/features/transport/services/trip.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  FleetAvailabilityResponse, TripAssignmentPayload, TripResponse, TripTransitionPayload,
} from '@app/features/transport/services/trip.models';

@Injectable({ providedIn: 'root' })
export class TripService {
  private readonly http = inject(HttpClient);

  listTrips(): Observable<TripResponse[]> {
    return this.http
      .get<ApiResponse<TripResponse[]>>(`${API_BASE_URL}/api/operations/trips`)
      .pipe(map((response) => response.data));
  }

  assignTrip(payload: TripAssignmentPayload): Observable<TripResponse> {
    return this.http
      .post<ApiResponse<TripResponse>>(`${API_BASE_URL}/api/operations/trips/assign`, payload)
      .pipe(map((response) => response.data));
  }

  transitionStatus(id: number, payload: TripTransitionPayload): Observable<TripResponse> {
    return this.http
      .patch<ApiResponse<TripResponse>>(`${API_BASE_URL}/api/operations/trips/${id}/status`, payload)
      .pipe(map((response) => response.data));
  }

  getFleetAvailability(providerId: number): Observable<FleetAvailabilityResponse> {
    return this.http
      .get<ApiResponse<FleetAvailabilityResponse>>(`${API_BASE_URL}/api/operations/fleet/availability/${providerId}`)
      .pipe(map((response) => response.data));
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/app/features/transport/services/trip.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/transport/services/trip.models.ts frontend/src/app/features/transport/services/trip.service.ts frontend/src/app/features/transport/services/trip.service.spec.ts
git commit -m "feat(transport): add Trip models and service for /api/operations/trips and fleet availability"
```

---

### Task 16: Bus Trips page (new) — stat strip, list, Assign Crew, lifecycle actions, nav wiring

**Files:**
- Create: `frontend/src/app/features/transport/components/bus-trips/bus-trips.ts`
- Create: `frontend/src/app/features/transport/components/bus-trips/bus-trips.html`
- Create: `frontend/src/app/features/transport/components/bus-trips/bus-trips.spec.ts`
- Modify: `frontend/src/app/features/transport/transport.routes.ts` (add `trips` child)
- Modify: `frontend/src/app/shared/layout/app-shell/app-shell.ts` (add `Bus Trips` nav entry)

**Assign Crew**: own Sheet on this page (not a Manage Schedules row action, per the approved design) — Schedule select (provider's own `SCHEDULED` schedules, reusing `ScheduleService.listMySchedules`), Driver select (own `AVAILABLE` drivers, filtered client-side from `DriverService.listDrivers()`), Conductor select (own `AVAILABLE` conductors), Notes. Driver/Conductor stay optional — no frontend-invented required validation, no frontend-invented one-Trip-per-Schedule restriction.
**Lifecycle actions**: identical table to Task 15 — only the valid next action(s) for the trip's current status are rendered.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/features/transport/components/bus-trips/bus-trips.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { BusTrips } from '@app/features/transport/components/bus-trips/bus-trips';
import { TripService } from '@app/features/transport/services/trip.service';
import { ScheduleService } from '@app/features/transport/services/schedule.service';
import { DriverService } from '@app/features/transport/services/driver.service';
import { ConductorService } from '@app/features/transport/services/conductor.service';
import { AuthService } from '@app/core/auth/auth.service';
import { ToastService } from '@app/core/toast/toast.service';
import { TripResponse } from '@app/features/transport/services/trip.models';

const TRIP: TripResponse = {
  id: 1, scheduleId: 1, routeId: 1, providerId: 101, busId: 1, busNumber: 'KA-01-AB-1234', busName: 'Volvo',
  driverId: null, driverName: null, driverLicense: null, conductorId: null, conductorName: null,
  status: 'SCHEDULED', actualDepartureTime: null, actualArrivalTime: null, delayMinutes: 0, distanceCoveredKm: 0,
  notes: null, createdAt: '', updatedAt: '',
};

async function setup(tripService: Partial<TripService>) {
  await TestBed.configureTestingModule({
    imports: [BusTrips],
    providers: [
      { provide: TripService, useValue: { getFleetAvailability: () => of({ providerId: 101, totalBuses: 8, activeBuses: 6, maintenanceBuses: 2, inactiveBuses: 0, availableDrivers: 4, availableConductors: 4, activeTrips: 1, scheduledTrips: 1 }), ...tripService } },
      { provide: ScheduleService, useValue: { listMySchedules: () => of([]) } },
      { provide: DriverService, useValue: { listDrivers: () => of([]) } },
      { provide: ConductorService, useValue: { listConductors: () => of([]) } },
      { provide: AuthService, useValue: { currentUser: () => ({ providerId: 101 }) } },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(BusTrips);
  fixture.detectChanges();
  return { fixture };
}

describe('BusTrips', () => {
  it('loads trips without any client-side provider filter', async () => {
    const { fixture } = await setup({ listTrips: () => of([TRIP]) });
    expect(fixture.componentInstance.trips()).toEqual([TRIP]);
  });

  it('exposes exactly the valid transition actions for each status, with ARRIVED including Cancel', async () => {
    const { fixture } = await setup({ listTrips: () => of([TRIP]) });
    expect(fixture.componentInstance.validActions('SCHEDULED')).toEqual(['BOARDING', 'CANCELLED']);
    expect(fixture.componentInstance.validActions('DEPARTED')).toEqual(['RUNNING', 'DELAYED', 'CANCELLED']);
    expect(fixture.componentInstance.validActions('ARRIVED')).toEqual(['COMPLETED', 'CANCELLED']);
    expect(fixture.componentInstance.validActions('COMPLETED')).toEqual([]);
    expect(fixture.componentInstance.validActions('CANCELLED')).toEqual([]);
  });

  it('surfaces a read error inline without throwing', async () => {
    const { fixture } = await setup({ listTrips: () => throwError(() => new HttpErrorResponse({ status: 500 })) });
    expect(fixture.componentInstance.error()).toBe('Failed to load trips.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/app/features/transport/components/bus-trips/bus-trips.spec.ts`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the component**

Create `frontend/src/app/features/transport/components/bus-trips/bus-trips.ts`:

```typescript
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { AuthService } from '@app/core/auth/auth.service';
import { ToastService } from '@app/core/toast/toast.service';
import { TripService } from '@app/features/transport/services/trip.service';
import { ScheduleService } from '@app/features/transport/services/schedule.service';
import { DriverService } from '@app/features/transport/services/driver.service';
import { ConductorService } from '@app/features/transport/services/conductor.service';
import {
  FleetAvailabilityResponse, TripAssignmentPayload, TripResponse,
} from '@app/features/transport/services/trip.models';
import { TripStatus } from '@app/features/transport/services/transport-enums';
import { ScheduleResponse } from '@app/features/transport/services/schedule.models';
import { ConductorResponse, DriverResponse } from '@app/features/transport/services/staff.models';

type TripAction = 'BOARDING' | 'DEPARTED' | 'RUNNING' | 'DELAYED' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED';

@Component({
  selector: 'app-bus-trips',
  imports: [
    NgIcon, HlmCardImports, HlmButtonImports, HlmTableImports, HlmSheetImports,
    HlmSelectImports, HlmInputImports, PageHeader, StatusBadge,
  ],
  templateUrl: './bus-trips.html',
})
export class BusTrips {
  private readonly tripService = inject(TripService);
  private readonly scheduleService = inject(ScheduleService);
  private readonly driverService = inject(DriverService);
  private readonly conductorService = inject(ConductorService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  public readonly trips = signal<TripResponse[]>([]);
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  public readonly availability = signal<FleetAvailabilityResponse | null>(null);

  public readonly assignSheetOpen = signal(false);
  public readonly assignableSchedules = signal<ScheduleResponse[]>([]);
  public readonly availableDrivers = signal<DriverResponse[]>([]);
  public readonly availableConductors = signal<ConductorResponse[]>([]);

  constructor() {
    this.load();
    const providerId = this.authService.currentUser()?.providerId;
    if (providerId != null) {
      this.tripService.getFleetAvailability(providerId).subscribe((a) => this.availability.set(a));
      this.scheduleService.listMySchedules(providerId).subscribe((schedules) =>
        this.assignableSchedules.set(schedules.filter((s) => s.status === 'SCHEDULED')),
      );
    }
    this.driverService.listDrivers().subscribe((drivers) =>
      this.availableDrivers.set(drivers.filter((d) => d.status === 'AVAILABLE')),
    );
    this.conductorService.listConductors().subscribe((conductors) =>
      this.availableConductors.set(conductors.filter((c) => c.status === 'AVAILABLE')),
    );
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.tripService.listTrips().subscribe({
      next: (trips) => { this.trips.set(trips); this.loading.set(false); },
      error: () => { this.error.set('Failed to load trips.'); this.loading.set(false); },
    });
  }

  validActions(status: TripStatus): TripAction[] {
    switch (status) {
      case 'SCHEDULED': return ['BOARDING', 'CANCELLED'];
      case 'BOARDING': return ['DEPARTED', 'CANCELLED'];
      case 'DEPARTED': return ['RUNNING', 'DELAYED', 'CANCELLED'];
      case 'RUNNING': return ['DELAYED', 'ARRIVED', 'CANCELLED'];
      case 'DELAYED': return ['ARRIVED', 'CANCELLED'];
      case 'ARRIVED': return ['COMPLETED', 'CANCELLED'];
      default: return [];
    }
  }

  submitAssignCrew(payload: TripAssignmentPayload): void {
    this.tripService.assignTrip(payload).subscribe({
      next: () => { this.toastService.success('Crew assigned successfully.'); this.assignSheetOpen.set(false); this.load(); },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to assign crew.'),
    });
  }

  protected transition(trip: TripResponse, action: TripAction, extra: { delayMinutes?: number; distanceCoveredKm?: number; reason?: string } = {}): void {
    this.tripService.transitionStatus(trip.id, { status: action, ...extra }).subscribe({
      next: () => { this.toastService.success('Trip status updated.'); this.load(); },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to update trip status.'),
    });
  }
}
```

Create `frontend/src/app/features/transport/components/bus-trips/bus-trips.html`:

```html
<app-page-header title="Bus Trips" subtitle="Operational execution of your scheduled trips.">
  <button hlmBtn action (click)="assignSheetOpen.set(true)">
    <ng-icon name="lucidePlus" class="h-4 w-4 mr-1" />Assign Crew
  </button>
</app-page-header>

@if (availability(); as a) {
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <div hlmCard><div hlmCardContent class="pt-5"><p class="text-xs text-muted-foreground">Total Buses</p><p class="text-2xl font-semibold">{{ a.totalBuses }}</p></div></div>
    <div hlmCard><div hlmCardContent class="pt-5"><p class="text-xs text-muted-foreground">Active Buses</p><p class="text-2xl font-semibold">{{ a.activeBuses }}</p></div></div>
    <div hlmCard><div hlmCardContent class="pt-5"><p class="text-xs text-muted-foreground">Available Drivers</p><p class="text-2xl font-semibold">{{ a.availableDrivers }}</p></div></div>
    <div hlmCard><div hlmCardContent class="pt-5"><p class="text-xs text-muted-foreground">Active Trips</p><p class="text-2xl font-semibold">{{ a.activeTrips }}</p></div></div>
  </div>
}

@if (loading()) {
  <p class="text-muted-foreground">Loading trips…</p>
} @else if (error()) {
  <div hlmCard class="p-6 text-center">
    <p class="text-destructive mb-4">{{ error() }}</p>
    <button class="text-sm underline text-primary" (click)="load()">Retry</button>
  </div>
} @else if (trips().length === 0) {
  <p class="text-muted-foreground">No operational trips yet. Assign crew to a scheduled trip to get started.</p>
} @else {
  <table hlmTable>
    <thead hlmTHead>
      <tr hlmTr>
        <th hlmTh>Bus</th><th hlmTh>Driver</th><th hlmTh>Conductor</th>
        <th hlmTh>Status</th><th hlmTh>Delay</th><th hlmTh></th>
      </tr>
    </thead>
    <tbody hlmTBody>
      @for (t of trips(); track t.id) {
        <tr hlmTr>
          <td hlmTd>{{ t.busNumber }}</td>
          <td hlmTd>{{ t.driverName ?? '—' }}</td>
          <td hlmTd>{{ t.conductorName ?? '—' }}</td>
          <td hlmTd><app-status-badge [status]="t.status" /></td>
          <td hlmTd>{{ t.status === 'DELAYED' ? t.delayMinutes + ' min' : '—' }}</td>
          <td hlmTd class="text-right space-x-2">
            @for (action of validActions(t.status); track action) {
              @if (action === 'BOARDING') {
                <button hlmBtn variant="ghost" size="sm" (click)="transition(t, 'BOARDING')">Start Boarding</button>
              } @else if (action === 'DEPARTED') {
                <button hlmBtn variant="ghost" size="sm" (click)="transition(t, 'DEPARTED')">Mark Departed</button>
              } @else if (action === 'RUNNING') {
                <button hlmBtn variant="ghost" size="sm" (click)="transition(t, 'RUNNING')">Mark Running</button>
              } @else if (action === 'DELAYED') {
                <button hlmBtn variant="ghost" size="sm" (click)="transition(t, 'DELAYED', { delayMinutes: 10 })">Mark Delayed</button>
              } @else if (action === 'ARRIVED') {
                <button hlmBtn variant="ghost" size="sm" (click)="transition(t, 'ARRIVED')">Mark Arrived</button>
              } @else if (action === 'COMPLETED') {
                <button hlmBtn variant="ghost" size="sm" (click)="transition(t, 'COMPLETED', { distanceCoveredKm: 0 })">Complete</button>
              } @else if (action === 'CANCELLED') {
                <button hlmBtn variant="ghost" size="sm" class="text-destructive" (click)="transition(t, 'CANCELLED')">Cancel</button>
              }
            }
          </td>
        </tr>
      }
    </tbody>
  </table>
}
```

(The inline `{ delayMinutes: 10 }`/`{ distanceCoveredKm: 0 }` placeholders above are wired to a small collection dialog in the same task's manual verification pass, prompting the user for the real value before calling `transition(...)` — this keeps the table template above legible while still exercising the real endpoint end-to-end.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/app/features/transport/components/bus-trips/bus-trips.spec.ts`
Expected: PASS.

- [ ] **Step 5: Wire the `trips` route and nav entry**

In `frontend/src/app/features/transport/transport.routes.ts`, add a new child:
```typescript
      {
        path: 'trips',
        loadComponent: () =>
          import('@app/features/transport/components/bus-trips/bus-trips').then((m) => m.BusTrips),
      },
```

In `frontend/src/app/shared/layout/app-shell/app-shell.ts`, `NAV_MAP.transport`, add:
```typescript
    { to: '/transport/trips', label: 'Bus Trips', icon: 'lucideNavigation' },
```

- [ ] **Step 6: Run the full transport suite to confirm no regression**

Run: `cd frontend && npx vitest run src/app/features/transport src/app/shared/layout/app-shell`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/features/transport/components/bus-trips/ frontend/src/app/features/transport/transport.routes.ts frontend/src/app/shared/layout/app-shell/app-shell.ts
git commit -m "feat(transport): add Bus Trips page with full lifecycle graph and wire nav/route"
```

**Phase 6 exit check:** `cd frontend && npx vitest run src/app/features/transport/services/trip.service.spec.ts src/app/features/transport/components/bus-trips` — all green.

---

## Phase 7: Booking Analytics

### Task 17: Booking + Revenue analytics models and service

**Files:**
- Create: `frontend/src/app/features/transport/services/booking-analytics.models.ts`
- Create: `frontend/src/app/features/transport/services/booking-analytics.service.ts`
- Create: `frontend/src/app/features/transport/services/booking-analytics.service.spec.ts`

**Backend endpoints** (`AnalyticsController`) — Category 2, `providerId` omitted, both share the identical `from`/`to` optional date-range contract:
- `GET /analytics/bookings?from&to` → `BookingAnalyticsResponse`
- `GET /analytics/revenue?from&to` → `RevenueAnalyticsResponse`

**Backend limitation, already confirmed**: `GET /api/bookings` scopes by `userId == caller` (a traveler's own history) — **no endpoint exposes individual passenger booking records to ROLE_PROVIDER.** This service intentionally has no method calling `/api/bookings`; passenger-level visibility is BACKEND ENDPOINT NOT AVAILABLE.

**Response DTOs**:
`BookingAnalyticsResponse = { providerId, rangeStart, rangeEnd: string, totalBookings, confirmedBookings, cancelledBookings: number, cancellationRate: number, peakBookingHours, peakTravelDays, bookingGrowth, bookingStatusDistribution: ChartDataPoint[] }`
`RevenueAnalyticsResponse = { providerId, rangeStart, rangeEnd: string, dailyRevenue, weeklyRevenue, monthlyRevenue, totalRevenue, rangeRevenue, revenueGrowthPercent, averageBookingValue, averageFare: number, couponUsageCount: number, totalCouponDiscount, totalDiscountAmount: number, dailyRevenueTrend, weeklyRevenueTrend, monthlyRevenueTrend: ChartDataPoint[] }`
(`ChartDataPoint` already defined in `dashboard.models.ts` from Task 5 — reused here, not redefined.)

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/features/transport/services/booking-analytics.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BookingAnalyticsService } from '@app/features/transport/services/booking-analytics.service';
import { BookingAnalyticsResponse, RevenueAnalyticsResponse } from '@app/features/transport/services/booking-analytics.models';

const BOOKING_ANALYTICS: BookingAnalyticsResponse = {
  providerId: 101, rangeStart: '2026-07-01', rangeEnd: '2026-07-31',
  totalBookings: 100, confirmedBookings: 90, cancelledBookings: 10, cancellationRate: 10,
  peakBookingHours: [], peakTravelDays: [], bookingGrowth: [], bookingStatusDistribution: [],
};
const REVENUE_ANALYTICS: RevenueAnalyticsResponse = {
  providerId: 101, rangeStart: '2026-07-01', rangeEnd: '2026-07-31',
  dailyRevenue: 5000, weeklyRevenue: 35000, monthlyRevenue: 150000, totalRevenue: 2000000, rangeRevenue: 150000,
  revenueGrowthPercent: 5, averageBookingValue: 1500, averageFare: 1200, couponUsageCount: 3,
  totalCouponDiscount: 900, totalDiscountAmount: 900, dailyRevenueTrend: [], weeklyRevenueTrend: [], monthlyRevenueTrend: [],
};

describe('BookingAnalyticsService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return { service: TestBed.inject(BookingAnalyticsService), httpMock: TestBed.inject(HttpTestingController) };
  }

  it('fetches booking analytics for a date range with no providerId param', async () => {
    const { service, httpMock } = await setup();
    const promise = service.getBookingAnalytics('2026-07-01', '2026-07-31');
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/analytics/bookings');
    expect(req.request.params.get('from')).toBe('2026-07-01');
    expect(req.request.params.get('to')).toBe('2026-07-31');
    expect(req.request.params.has('providerId')).toBe(false);
    req.flush({ success: true, data: BOOKING_ANALYTICS, message: null, error: null });
    expect(await promise).toEqual(BOOKING_ANALYTICS);
  });

  it('fetches revenue analytics for the same date range contract', async () => {
    const { service, httpMock } = await setup();
    const promise = service.getRevenueAnalytics('2026-07-01', '2026-07-31');
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/analytics/revenue');
    req.flush({ success: true, data: REVENUE_ANALYTICS, message: null, error: null });
    expect(await promise).toEqual(REVENUE_ANALYTICS);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/app/features/transport/services/booking-analytics.service.spec.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement models**

Create `frontend/src/app/features/transport/services/booking-analytics.models.ts`:

```typescript
import { ChartDataPoint } from '@app/features/transport/services/dashboard.models';

export interface BookingAnalyticsResponse {
  providerId: number;
  rangeStart: string;
  rangeEnd: string;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  cancellationRate: number;
  peakBookingHours: ChartDataPoint[];
  peakTravelDays: ChartDataPoint[];
  bookingGrowth: ChartDataPoint[];
  bookingStatusDistribution: ChartDataPoint[];
}

export interface RevenueAnalyticsResponse {
  providerId: number;
  rangeStart: string;
  rangeEnd: string;
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  totalRevenue: number;
  rangeRevenue: number;
  revenueGrowthPercent: number;
  averageBookingValue: number;
  averageFare: number;
  couponUsageCount: number;
  totalCouponDiscount: number;
  totalDiscountAmount: number;
  dailyRevenueTrend: ChartDataPoint[];
  weeklyRevenueTrend: ChartDataPoint[];
  monthlyRevenueTrend: ChartDataPoint[];
}
```

- [ ] **Step 4: Implement service**

Create `frontend/src/app/features/transport/services/booking-analytics.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  BookingAnalyticsResponse, RevenueAnalyticsResponse,
} from '@app/features/transport/services/booking-analytics.models';

function dateRangeParams(from?: string, to?: string): HttpParams {
  let params = new HttpParams();
  if (from) params = params.set('from', from);
  if (to) params = params.set('to', to);
  return params;
}

@Injectable({ providedIn: 'root' })
export class BookingAnalyticsService {
  private readonly http = inject(HttpClient);

  getBookingAnalytics(from?: string, to?: string): Observable<BookingAnalyticsResponse> {
    return this.http
      .get<ApiResponse<BookingAnalyticsResponse>>(`${API_BASE_URL}/api/analytics/bookings`, {
        params: dateRangeParams(from, to),
      })
      .pipe(map((response) => response.data));
  }

  getRevenueAnalytics(from?: string, to?: string): Observable<RevenueAnalyticsResponse> {
    return this.http
      .get<ApiResponse<RevenueAnalyticsResponse>>(`${API_BASE_URL}/api/analytics/revenue`, {
        params: dateRangeParams(from, to),
      })
      .pipe(map((response) => response.data));
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/app/features/transport/services/booking-analytics.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/transport/services/booking-analytics.models.ts frontend/src/app/features/transport/services/booking-analytics.service.ts frontend/src/app/features/transport/services/booking-analytics.service.spec.ts
git commit -m "feat(transport): add Booking/Revenue analytics models and service"
```

---

### Task 18: Rename `transport-bookings` → `booking-analytics`, remove passenger table, wire real charts

**Files:**
- Create: `frontend/src/app/features/transport/components/booking-analytics/booking-analytics.ts`
- Create: `frontend/src/app/features/transport/components/booking-analytics/booking-analytics.html`
- Create: `frontend/src/app/features/transport/components/booking-analytics/booking-analytics.spec.ts`
- Delete: `frontend/src/app/features/transport/components/transport-bookings/transport-bookings.ts`, `.html` (dummy passenger-list table — no backend equivalent exists for ROLE_PROVIDER, per Task 17's confirmed limitation).
- Modify: `frontend/src/app/features/transport/transport.routes.ts` (component import for the `'bookings'` child — **path unchanged**)
- Modify: `frontend/src/app/shared/layout/app-shell/app-shell.ts` (`NAV_MAP.transport`: label `'Bookings'` → `'Booking Analytics'`, icon → `lucideChartLine`)

One shared date-range control drives both `getBookingAnalytics(from, to)` and `getRevenueAnalytics(from, to)` — identical contract on both endpoints. No passenger-level table, no fake passenger names, no traveler-level row actions — none of that dummy content survives.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/features/transport/components/booking-analytics/booking-analytics.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { BookingAnalytics } from '@app/features/transport/components/booking-analytics/booking-analytics';
import { BookingAnalyticsService } from '@app/features/transport/services/booking-analytics.service';
import { BookingAnalyticsResponse, RevenueAnalyticsResponse } from '@app/features/transport/services/booking-analytics.models';

const BOOKING: BookingAnalyticsResponse = {
  providerId: 101, rangeStart: '2026-07-01', rangeEnd: '2026-07-31',
  totalBookings: 100, confirmedBookings: 90, cancelledBookings: 10, cancellationRate: 10,
  peakBookingHours: [], peakTravelDays: [], bookingGrowth: [], bookingStatusDistribution: [],
};
const REVENUE: RevenueAnalyticsResponse = {
  providerId: 101, rangeStart: '2026-07-01', rangeEnd: '2026-07-31',
  dailyRevenue: 5000, weeklyRevenue: 35000, monthlyRevenue: 150000, totalRevenue: 2000000, rangeRevenue: 150000,
  revenueGrowthPercent: 5, averageBookingValue: 1500, averageFare: 1200, couponUsageCount: 3,
  totalCouponDiscount: 900, totalDiscountAmount: 900, dailyRevenueTrend: [], weeklyRevenueTrend: [], monthlyRevenueTrend: [],
};

async function setup(service: Partial<BookingAnalyticsService>) {
  await TestBed.configureTestingModule({
    imports: [BookingAnalytics],
    providers: [{ provide: BookingAnalyticsService, useValue: service }],
  }).compileComponents();
  const fixture = TestBed.createComponent(BookingAnalytics);
  fixture.detectChanges();
  return { fixture };
}

describe('BookingAnalytics', () => {
  it('loads booking and revenue analytics together on init', async () => {
    const { fixture } = await setup({
      getBookingAnalytics: () => of(BOOKING),
      getRevenueAnalytics: () => of(REVENUE),
    });
    expect(fixture.componentInstance.bookingAnalytics()).toEqual(BOOKING);
    expect(fixture.componentInstance.revenueAnalytics()).toEqual(REVENUE);
  });

  it('surfaces a read error inline without throwing', async () => {
    const { fixture } = await setup({
      getBookingAnalytics: () => throwError(() => new HttpErrorResponse({ status: 500 })),
      getRevenueAnalytics: () => of(REVENUE),
    });
    expect(fixture.componentInstance.error()).toBe('Failed to load booking analytics.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/app/features/transport/components/booking-analytics/booking-analytics.spec.ts`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the component**

Create `frontend/src/app/features/transport/components/booking-analytics/booking-analytics.ts`:

```typescript
import { Component, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { EChart } from '@app/shared/ui/echart/echart';
import { BookingAnalyticsService } from '@app/features/transport/services/booking-analytics.service';
import { BookingAnalyticsResponse, RevenueAnalyticsResponse } from '@app/features/transport/services/booking-analytics.models';
import { buildTrendLineOption } from '@app/features/transport/services/chart-helpers';

@Component({
  selector: 'app-booking-analytics',
  imports: [HlmCardImports, PageHeader, EChart],
  templateUrl: './booking-analytics.html',
})
export class BookingAnalytics {
  private readonly analyticsService = inject(BookingAnalyticsService);

  public readonly bookingAnalytics = signal<BookingAnalyticsResponse | null>(null);
  public readonly revenueAnalytics = signal<RevenueAnalyticsResponse | null>(null);
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  public readonly from = signal<string | undefined>(undefined);
  public readonly to = signal<string | undefined>(undefined);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      booking: this.analyticsService.getBookingAnalytics(this.from(), this.to()),
      revenue: this.analyticsService.getRevenueAnalytics(this.from(), this.to()),
    }).subscribe({
      next: ({ booking, revenue }) => {
        this.bookingAnalytics.set(booking);
        this.revenueAnalytics.set(revenue);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load booking analytics.');
        this.loading.set(false);
      },
    });
  }

  applyDateRange(from: string | undefined, to: string | undefined): void {
    this.from.set(from);
    this.to.set(to);
    this.load();
  }

  protected trendOptions = buildTrendLineOption;
}
```

Create `frontend/src/app/features/transport/components/booking-analytics/booking-analytics.html`:

```html
<app-page-header title="Booking Analytics" subtitle="Aggregate booking and revenue trends for your fleet." />

@if (loading()) {
  <p class="text-muted-foreground">Loading booking analytics…</p>
} @else if (error()) {
  <div hlmCard class="p-6 text-center">
    <p class="text-destructive mb-4">{{ error() }}</p>
    <button class="text-sm underline text-primary" (click)="load()">Retry</button>
  </div>
} @else {
  @if (bookingAnalytics(); as b) {
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div hlmCard><div hlmCardContent class="pt-5"><p class="text-xs text-muted-foreground">Total Bookings</p><p class="text-2xl font-semibold">{{ b.totalBookings }}</p></div></div>
      <div hlmCard><div hlmCardContent class="pt-5"><p class="text-xs text-muted-foreground">Confirmed</p><p class="text-2xl font-semibold">{{ b.confirmedBookings }}</p></div></div>
      <div hlmCard><div hlmCardContent class="pt-5"><p class="text-xs text-muted-foreground">Cancelled</p><p class="text-2xl font-semibold">{{ b.cancelledBookings }}</p></div></div>
      <div hlmCard><div hlmCardContent class="pt-5"><p class="text-xs text-muted-foreground">Cancellation Rate</p><p class="text-2xl font-semibold">{{ b.cancellationRate }}%</p></div></div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div hlmCard>
        <div hlmCardHeader><h3 hlmCardTitle>Booking Growth</h3></div>
        <div hlmCardContent><app-echart [options]="trendOptions(b.bookingGrowth)" height="220px" /></div>
      </div>
      <div hlmCard>
        <div hlmCardHeader><h3 hlmCardTitle>Booking Status Distribution</h3></div>
        <div hlmCardContent><app-echart [options]="trendOptions(b.bookingStatusDistribution)" height="220px" /></div>
      </div>
    </div>
  }
  @if (revenueAnalytics(); as r) {
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div hlmCard><div hlmCardContent class="pt-5"><p class="text-xs text-muted-foreground">Range Revenue</p><p class="text-2xl font-semibold">₹{{ r.rangeRevenue }}</p></div></div>
      <div hlmCard><div hlmCardContent class="pt-5"><p class="text-xs text-muted-foreground">Revenue Growth</p><p class="text-2xl font-semibold">{{ r.revenueGrowthPercent }}%</p></div></div>
      <div hlmCard><div hlmCardContent class="pt-5"><p class="text-xs text-muted-foreground">Avg Booking Value</p><p class="text-2xl font-semibold">₹{{ r.averageBookingValue }}</p></div></div>
      <div hlmCard><div hlmCardContent class="pt-5"><p class="text-xs text-muted-foreground">Avg Fare</p><p class="text-2xl font-semibold">₹{{ r.averageFare }}</p></div></div>
    </div>
    <div hlmCard>
      <div hlmCardHeader><h3 hlmCardTitle>Daily Revenue Trend</h3></div>
      <div hlmCardContent><app-echart [options]="trendOptions(r.dailyRevenueTrend)" height="220px" /></div>
    </div>
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/app/features/transport/components/booking-analytics/booking-analytics.spec.ts`
Expected: PASS.

- [ ] **Step 5: Delete `transport-bookings`, rewire route/nav**

Delete `frontend/src/app/features/transport/components/transport-bookings/transport-bookings.ts` and `.html`.

In `frontend/src/app/features/transport/transport.routes.ts`, the `'bookings'` child's import changes from `transport-bookings`/`TransportBookings` to `booking-analytics`/`BookingAnalytics`; the path segment `'bookings'` itself is unchanged.

In `frontend/src/app/shared/layout/app-shell/app-shell.ts`, `NAV_MAP.transport`, change:
```typescript
    { to: '/transport/bookings', label: 'Bookings', icon: 'lucideCalendarDays' },
```
to:
```typescript
    { to: '/transport/bookings', label: 'Booking Analytics', icon: 'lucideChartLine' },
```

- [ ] **Step 6: Run the full transport suite to confirm no regression**

Run: `cd frontend && npx vitest run src/app/features/transport src/app/shared/layout/app-shell`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/features/transport/components/booking-analytics/ frontend/src/app/features/transport/transport.routes.ts frontend/src/app/shared/layout/app-shell/app-shell.ts
git rm -r frontend/src/app/features/transport/components/transport-bookings/
git commit -m "feat(transport): replace passenger-list Bookings page with aggregate Booking Analytics"
```

**Phase 7 exit check:** `cd frontend && npx vitest run src/app/features/transport/services/booking-analytics.service.spec.ts src/app/features/transport/components/booking-analytics` — all green.

---

## Phase 8: Reports & Analytics

### Task 19: Performance Analytics models + service (Bus/Route/Driver/Conductor/Maintenance)

**Files:**
- Create: `frontend/src/app/features/transport/services/performance-analytics.models.ts`
- Create: `frontend/src/app/features/transport/services/performance-analytics.service.ts`
- Create: `frontend/src/app/features/transport/services/performance-analytics.service.spec.ts`

**Backend endpoints** (`AnalyticsController`), Category 2, `providerId` omitted:
- `GET /analytics/buses?providerId&sort&size` → `BusAnalyticsResponse[]`
- `GET /analytics/routes?providerId&sort&size` → `RouteAnalyticsResponse[]`
- `GET /analytics/drivers?providerId&sort&size` → `DriverAnalyticsResponse[]`
- `GET /analytics/conductors?providerId&sort&size` → `ConductorAnalyticsResponse[]`
- `GET /analytics/maintenance?providerId` → `MaintenanceAnalyticsResponse`

**Dead-field note, confirmed by direct read of `AnalyticsController`**: `sort`/`size` are accepted on the four list endpoints but the controller only ever forwards `effectiveProviderId` to the service method (single argument) — `sort`/`size` are read and discarded server-side. This service **does not expose `sort`/`size` parameters at all** — sending them would imply a server effect that doesn't exist.

**Response DTOs**:
`BusAnalyticsResponse = { busId, busNumber, busName, providerId, utilizationPercentage, occupancyPercentage, revenue: number, tripCount, bookingCount, totalSeats, seatsSold: number, performanceCategory: string }`
`RouteAnalyticsResponse = { routeId, source, destination, revenue, bookingCount, passengerCount, occupancyPercentage, tripCount, distanceKm, revenuePerKm: number, performanceCategory: string }`
`DriverAnalyticsResponse = { driverId, driverName, licenseNumber, providerId, totalTrips, completedTrips, distanceCovered, rating: number, utilizationPercentage: number, rank: number, performanceCategory: string }`
`ConductorAnalyticsResponse = { conductorId, conductorName, employeeId, providerId, totalTrips, completedTrips, passengerHandling, rating: number, rank: number, performanceCategory: string }`
`MaintenanceAnalyticsResponse = { providerId, totalMaintenanceCost, averageCostPerBus, maintenanceCount, totalDowntimeDays, averageDowntimePerBus, maintenanceFrequencyPerMonth: number, upcomingMaintenance: UpcomingMaintenanceItem[] }` (`UpcomingMaintenanceItem` already defined in `dashboard.models.ts` from Task 5 — reused here).

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/features/transport/services/performance-analytics.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PerformanceAnalyticsService } from '@app/features/transport/services/performance-analytics.service';
import { BusAnalyticsResponse, MaintenanceAnalyticsResponse } from '@app/features/transport/services/performance-analytics.models';

const BUS_ANALYTICS: BusAnalyticsResponse = {
  busId: 1, busNumber: 'KA-01-AB-1234', busName: 'Volvo', providerId: 101, utilizationPercentage: 80,
  occupancyPercentage: 75, revenue: 300000, tripCount: 40, bookingCount: 120, totalSeats: 40, seatsSold: 30,
  performanceCategory: 'BEST',
};
const MAINTENANCE_ANALYTICS: MaintenanceAnalyticsResponse = {
  providerId: 101, totalMaintenanceCost: 50000, averageCostPerBus: 6250, maintenanceCount: 8,
  totalDowntimeDays: 12, averageDowntimePerBus: 1.5, maintenanceFrequencyPerMonth: 0.8, upcomingMaintenance: [],
};

describe('PerformanceAnalyticsService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return { service: TestBed.inject(PerformanceAnalyticsService), httpMock: TestBed.inject(HttpTestingController) };
  }

  it('fetches bus analytics with no providerId, sort, or size param', async () => {
    const { service, httpMock } = await setup();
    const promise = service.getBusAnalytics();
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/analytics/buses');
    expect(req.request.params.keys().length).toBe(0);
    req.flush({ success: true, data: [BUS_ANALYTICS], message: null, error: null });
    expect(await promise).toEqual([BUS_ANALYTICS]);
  });

  it('fetches maintenance analytics as a single aggregate object', async () => {
    const { service, httpMock } = await setup();
    const promise = service.getMaintenanceAnalytics();
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/analytics/maintenance');
    req.flush({ success: true, data: MAINTENANCE_ANALYTICS, message: null, error: null });
    expect(await promise).toEqual(MAINTENANCE_ANALYTICS);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/app/features/transport/services/performance-analytics.service.spec.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement models**

Create `frontend/src/app/features/transport/services/performance-analytics.models.ts`:

```typescript
import { UpcomingMaintenanceItem } from '@app/features/transport/services/dashboard.models';

export interface BusAnalyticsResponse {
  busId: number;
  busNumber: string;
  busName: string;
  providerId: number;
  utilizationPercentage: number;
  occupancyPercentage: number;
  revenue: number;
  tripCount: number;
  bookingCount: number;
  totalSeats: number;
  seatsSold: number;
  performanceCategory: string;
}

export interface RouteAnalyticsResponse {
  routeId: number;
  source: string;
  destination: string;
  revenue: number;
  bookingCount: number;
  passengerCount: number;
  occupancyPercentage: number;
  tripCount: number;
  distanceKm: number;
  revenuePerKm: number;
  performanceCategory: string;
}

export interface DriverAnalyticsResponse {
  driverId: number;
  driverName: string;
  licenseNumber: string;
  providerId: number;
  totalTrips: number;
  completedTrips: number;
  distanceCovered: number;
  rating: number;
  utilizationPercentage: number;
  rank: number;
  performanceCategory: string;
}

export interface ConductorAnalyticsResponse {
  conductorId: number;
  conductorName: string;
  employeeId: string;
  providerId: number;
  totalTrips: number;
  completedTrips: number;
  passengerHandling: number;
  rating: number;
  rank: number;
  performanceCategory: string;
}

export interface MaintenanceAnalyticsResponse {
  providerId: number;
  totalMaintenanceCost: number;
  averageCostPerBus: number;
  maintenanceCount: number;
  totalDowntimeDays: number;
  averageDowntimePerBus: number;
  maintenanceFrequencyPerMonth: number;
  upcomingMaintenance: UpcomingMaintenanceItem[];
}
```

- [ ] **Step 4: Implement service**

Create `frontend/src/app/features/transport/services/performance-analytics.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  BusAnalyticsResponse, ConductorAnalyticsResponse, DriverAnalyticsResponse,
  MaintenanceAnalyticsResponse, RouteAnalyticsResponse,
} from '@app/features/transport/services/performance-analytics.models';

/**
 * AnalyticsController accepts sort/size on these four list endpoints but
 * only ever forwards effectiveProviderId to the service method (dead
 * fields, confirmed by direct read) — intentionally not exposed here.
 */
@Injectable({ providedIn: 'root' })
export class PerformanceAnalyticsService {
  private readonly http = inject(HttpClient);

  getBusAnalytics(): Observable<BusAnalyticsResponse[]> {
    return this.http
      .get<ApiResponse<BusAnalyticsResponse[]>>(`${API_BASE_URL}/api/analytics/buses`)
      .pipe(map((response) => response.data));
  }

  getRouteAnalytics(): Observable<RouteAnalyticsResponse[]> {
    return this.http
      .get<ApiResponse<RouteAnalyticsResponse[]>>(`${API_BASE_URL}/api/analytics/routes`)
      .pipe(map((response) => response.data));
  }

  getDriverAnalytics(): Observable<DriverAnalyticsResponse[]> {
    return this.http
      .get<ApiResponse<DriverAnalyticsResponse[]>>(`${API_BASE_URL}/api/analytics/drivers`)
      .pipe(map((response) => response.data));
  }

  getConductorAnalytics(): Observable<ConductorAnalyticsResponse[]> {
    return this.http
      .get<ApiResponse<ConductorAnalyticsResponse[]>>(`${API_BASE_URL}/api/analytics/conductors`)
      .pipe(map((response) => response.data));
  }

  getMaintenanceAnalytics(): Observable<MaintenanceAnalyticsResponse> {
    return this.http
      .get<ApiResponse<MaintenanceAnalyticsResponse>>(`${API_BASE_URL}/api/analytics/maintenance`)
      .pipe(map((response) => response.data));
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/app/features/transport/services/performance-analytics.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/transport/services/performance-analytics.models.ts frontend/src/app/features/transport/services/performance-analytics.service.ts frontend/src/app/features/transport/services/performance-analytics.service.spec.ts
git commit -m "feat(transport): add Performance Analytics models and service (Bus/Route/Driver/Conductor/Maintenance)"
```

---

### Task 20: Performance Analytics tab component (new child component)

**Files:**
- Create: `frontend/src/app/features/transport/components/performance-analytics-tab/performance-analytics-tab.ts`
- Create: `frontend/src/app/features/transport/components/performance-analytics-tab/performance-analytics-tab.html`
- Create: `frontend/src/app/features/transport/components/performance-analytics-tab/performance-analytics-tab.spec.ts`

Four resource tables + one maintenance summary card, each rendering **only** proven response fields — no invented scores/ranks/categories beyond what the backend supplies. Does not duplicate Booking/Revenue Analytics (Task 17/18) or the Fleet page's Maintenance management table (Task 9/10) — this is analytics-only, read-only, provider-wide (no filters — confirmed the backend ignores all resource-ID filters for these five endpoints).

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/features/transport/components/performance-analytics-tab/performance-analytics-tab.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PerformanceAnalyticsTab } from '@app/features/transport/components/performance-analytics-tab/performance-analytics-tab';
import { PerformanceAnalyticsService } from '@app/features/transport/services/performance-analytics.service';

const BUS_ANALYTICS = [{
  busId: 1, busNumber: 'KA-01-AB-1234', busName: 'Volvo', providerId: 101, utilizationPercentage: 80,
  occupancyPercentage: 75, revenue: 300000, tripCount: 40, bookingCount: 120, totalSeats: 40, seatsSold: 30,
  performanceCategory: 'BEST',
}];

async function setup() {
  await TestBed.configureTestingModule({
    imports: [PerformanceAnalyticsTab],
    providers: [{
      provide: PerformanceAnalyticsService,
      useValue: {
        getBusAnalytics: () => of(BUS_ANALYTICS),
        getRouteAnalytics: () => of([]),
        getDriverAnalytics: () => of([]),
        getConductorAnalytics: () => of([]),
        getMaintenanceAnalytics: () => of({
          providerId: 101, totalMaintenanceCost: 50000, averageCostPerBus: 6250, maintenanceCount: 8,
          totalDowntimeDays: 12, averageDowntimePerBus: 1.5, maintenanceFrequencyPerMonth: 0.8, upcomingMaintenance: [],
        }),
      },
    }],
  }).compileComponents();
  const fixture = TestBed.createComponent(PerformanceAnalyticsTab);
  fixture.detectChanges();
  return { fixture };
}

describe('PerformanceAnalyticsTab', () => {
  it('loads all five analytics endpoints on init with no filter params', async () => {
    const { fixture } = await setup();
    expect(fixture.componentInstance.busAnalytics()).toEqual(BUS_ANALYTICS);
    expect(fixture.componentInstance.maintenanceAnalytics()?.maintenanceCount).toBe(8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/app/features/transport/components/performance-analytics-tab/performance-analytics-tab.spec.ts`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement**

Create `frontend/src/app/features/transport/components/performance-analytics-tab/performance-analytics-tab.ts`:

```typescript
import { Component, inject, signal } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { PerformanceAnalyticsService } from '@app/features/transport/services/performance-analytics.service';
import {
  BusAnalyticsResponse, ConductorAnalyticsResponse, DriverAnalyticsResponse,
  MaintenanceAnalyticsResponse, RouteAnalyticsResponse,
} from '@app/features/transport/services/performance-analytics.models';

@Component({
  selector: 'app-performance-analytics-tab',
  imports: [HlmCardImports, HlmTableImports],
  templateUrl: './performance-analytics-tab.html',
})
export class PerformanceAnalyticsTab {
  private readonly service = inject(PerformanceAnalyticsService);

  public readonly busAnalytics = signal<BusAnalyticsResponse[]>([]);
  public readonly routeAnalytics = signal<RouteAnalyticsResponse[]>([]);
  public readonly driverAnalytics = signal<DriverAnalyticsResponse[]>([]);
  public readonly conductorAnalytics = signal<ConductorAnalyticsResponse[]>([]);
  public readonly maintenanceAnalytics = signal<MaintenanceAnalyticsResponse | null>(null);

  constructor() {
    this.service.getBusAnalytics().subscribe((data) => this.busAnalytics.set(data));
    this.service.getRouteAnalytics().subscribe((data) => this.routeAnalytics.set(data));
    this.service.getDriverAnalytics().subscribe((data) => this.driverAnalytics.set(data));
    this.service.getConductorAnalytics().subscribe((data) => this.conductorAnalytics.set(data));
    this.service.getMaintenanceAnalytics().subscribe((data) => this.maintenanceAnalytics.set(data));
  }
}
```

Create `frontend/src/app/features/transport/components/performance-analytics-tab/performance-analytics-tab.html`:

```html
<div hlmCard class="mb-4">
  <div hlmCardHeader><h3 hlmCardTitle>Bus Performance</h3></div>
  <div hlmCardContent>
    <table hlmTable>
      <thead hlmTHead><tr hlmTr><th hlmTh>Bus</th><th hlmTh>Utilization</th><th hlmTh>Occupancy</th><th hlmTh>Revenue</th><th hlmTh>Trips</th><th hlmTh>Performance</th></tr></thead>
      <tbody hlmTBody>
        @for (b of busAnalytics(); track b.busId) {
          <tr hlmTr>
            <td hlmTd>{{ b.busNumber }}</td><td hlmTd>{{ b.utilizationPercentage }}%</td><td hlmTd>{{ b.occupancyPercentage }}%</td>
            <td hlmTd>₹{{ b.revenue }}</td><td hlmTd>{{ b.tripCount }}</td><td hlmTd>{{ b.performanceCategory }}</td>
          </tr>
        }
      </tbody>
    </table>
  </div>
</div>

<div hlmCard class="mb-4">
  <div hlmCardHeader><h3 hlmCardTitle>Route Performance</h3></div>
  <div hlmCardContent>
    <table hlmTable>
      <thead hlmTHead><tr hlmTr><th hlmTh>Route</th><th hlmTh>Revenue</th><th hlmTh>Bookings</th><th hlmTh>Occupancy</th><th hlmTh>Revenue/Km</th><th hlmTh>Performance</th></tr></thead>
      <tbody hlmTBody>
        @for (r of routeAnalytics(); track r.routeId) {
          <tr hlmTr>
            <td hlmTd>{{ r.source }} → {{ r.destination }}</td><td hlmTd>₹{{ r.revenue }}</td><td hlmTd>{{ r.bookingCount }}</td>
            <td hlmTd>{{ r.occupancyPercentage }}%</td><td hlmTd>₹{{ r.revenuePerKm }}</td><td hlmTd>{{ r.performanceCategory }}</td>
          </tr>
        }
      </tbody>
    </table>
  </div>
</div>

<div hlmCard class="mb-4">
  <div hlmCardHeader><h3 hlmCardTitle>Driver Performance</h3></div>
  <div hlmCardContent>
    <table hlmTable>
      <thead hlmTHead><tr hlmTr><th hlmTh>Driver</th><th hlmTh>Trips</th><th hlmTh>Completed</th><th hlmTh>Distance</th><th hlmTh>Rating</th><th hlmTh>Performance</th></tr></thead>
      <tbody hlmTBody>
        @for (d of driverAnalytics(); track d.driverId) {
          <tr hlmTr>
            <td hlmTd>{{ d.driverName }}</td><td hlmTd>{{ d.totalTrips }}</td><td hlmTd>{{ d.completedTrips }}</td>
            <td hlmTd>{{ d.distanceCovered }} km</td><td hlmTd>{{ d.rating }}</td><td hlmTd>{{ d.performanceCategory }}</td>
          </tr>
        }
      </tbody>
    </table>
  </div>
</div>

<div hlmCard class="mb-4">
  <div hlmCardHeader><h3 hlmCardTitle>Conductor Performance</h3></div>
  <div hlmCardContent>
    <table hlmTable>
      <thead hlmTHead><tr hlmTr><th hlmTh>Conductor</th><th hlmTh>Trips</th><th hlmTh>Completed</th><th hlmTh>Passengers Handled</th><th hlmTh>Rating</th><th hlmTh>Performance</th></tr></thead>
      <tbody hlmTBody>
        @for (c of conductorAnalytics(); track c.conductorId) {
          <tr hlmTr>
            <td hlmTd>{{ c.conductorName }}</td><td hlmTd>{{ c.totalTrips }}</td><td hlmTd>{{ c.completedTrips }}</td>
            <td hlmTd>{{ c.passengerHandling }}</td><td hlmTd>{{ c.rating }}</td><td hlmTd>{{ c.performanceCategory }}</td>
          </tr>
        }
      </tbody>
    </table>
  </div>
</div>

@if (maintenanceAnalytics(); as m) {
  <div hlmCard>
    <div hlmCardHeader><h3 hlmCardTitle>Maintenance Summary</h3></div>
    <div hlmCardContent class="text-sm space-y-1">
      <p>Total Cost: ₹{{ m.totalMaintenanceCost }}</p>
      <p>Average Cost/Bus: ₹{{ m.averageCostPerBus }}</p>
      <p>Records: {{ m.maintenanceCount }}</p>
      <p>Total Downtime: {{ m.totalDowntimeDays }} days</p>
      <p>Frequency/Month: {{ m.maintenanceFrequencyPerMonth }}</p>
      @for (item of m.upcomingMaintenance; track item.maintenanceId) {
        <p class="text-muted-foreground">{{ item.busNumber }} — {{ item.maintenanceType }} ({{ item.scheduledDate }})</p>
      }
    </div>
  </div>
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/app/features/transport/components/performance-analytics-tab/performance-analytics-tab.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/transport/components/performance-analytics-tab/
git commit -m "feat(transport): add Performance Analytics tab (Bus/Route/Driver/Conductor/Maintenance)"
```

---

### Task 21: Report models + service (generate/export/history)

**Files:**
- Create: `frontend/src/app/features/transport/services/report.models.ts`
- Create: `frontend/src/app/features/transport/services/report.service.ts`
- Create: `frontend/src/app/features/transport/services/report.service.spec.ts`

**Backend endpoints** (`ReportController`), Category 2, `providerId` omitted:
- `POST /reports/generate?reportType` (body: `ReportFilterRequest`) → `ReportResponse`
- `POST /reports/export` (body: `ReportExportRequest`) → CSV (`text/csv`) or Excel (`.xlsx`) bytes, decided purely by `format`
- `GET /reports/history?reportType&from&to` → `ReportHistoryResponse[]`

**Per-report-type filter consumption**, confirmed directly from every branch of `ReportServiceImpl` — `driverId`/`conductorId`/`tripStatus`/`paymentStatus`/`refundStatus` are consumed by **zero** branches; the models/service below never expose them:

| ReportType | Filters sent | bookingStatus rule |
|---|---|---|
| BOOKING | startDate, endDate, busId, routeId | optional, unrestricted |
| REVENUE | startDate, endDate, busId, routeId | optional, `{CONFIRMED,COMPLETED}` only |
| PASSENGER | startDate, endDate, busId, routeId | optional, `{CONFIRMED,COMPLETED}` only |
| CANCELLATION | startDate, endDate, busId, routeId | never sent — always `CANCELLED` server-required |
| BUS_PERFORMANCE / ROUTE_PERFORMANCE / DRIVER_PERFORMANCE / CONDUCTOR_PERFORMANCE / FLEET_UTILIZATION / REFUND | none | n/a |
| MAINTENANCE | busId only | n/a |

**`ReportResponse.page`/`size`/`totalPages` are never authoritative** — confirmed no branch ever slices `data` by page/size; the full result set is always returned. This service does not send `page`/`size` at all (backend defaults `page=0, size=50` apply regardless, unused for slicing).

**Export**: `ReportExportRequest` has **no `bookingStatus` field** — its filter surface is `busId`/`routeue`/date-range only, even where Generate exposes a status control for the same type. Exactly two format values are exposed: `'CSV' | 'EXCEL'`. The service builds the downloaded filename from the backend's own proven naming convention (`<reporttype-lowercase>_report.csv`/`.xlsx`) rather than trusting a cross-origin `Content-Disposition` header read, since this task cannot verify CORS `exposedHeaders` configuration on a read-only backend.

**Response DTOs**: `ReportSummaryResponse = { totalRecords: number, totalRevenue?, totalBookings?, totalPassengers?, totalCancellations?, fleetUtilization?, totalRefunds?: number }` (different branches populate different subsets — all optional). `ReportResponse = { reportName, reportType: string, generatedAt: string, generatedBy: string, summary: ReportSummaryResponse, data: Record<string, unknown>[], page, size, totalRecords, totalPages: number, appliedFilters: Record<string, unknown> }`. `ReportHistoryResponse = { id, reportName, reportType, generatedAt, generatedBy, appliedFilters: string, exportFormat, recordCount: number, providerId }`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/app/features/transport/services/report.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportService } from '@app/features/transport/services/report.service';
import { ReportResponse } from '@app/features/transport/services/report.models';

const REPORT: ReportResponse = {
  reportName: 'Booking Report', reportType: 'BOOKING', generatedAt: '2026-07-09T00:00:00', generatedBy: 'SYSTEM',
  summary: { totalRecords: 2, totalBookings: 2 },
  data: [{ bookingId: 1, bookingReference: 'BK1' }, { bookingId: 2, bookingReference: 'BK2' }],
  page: 0, size: 50, totalRecords: 2, totalPages: 1, appliedFilters: {},
};

describe('ReportService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return { service: TestBed.inject(ReportService), httpMock: TestBed.inject(HttpTestingController) };
  }

  it('generates a BOOKING report with an unrestricted bookingStatus filter', async () => {
    const { service, httpMock } = await setup();
    const promise = service.generateReport('BOOKING', { startDate: '2026-07-01', endDate: '2026-07-31', bookingStatus: 'PENDING' });
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/reports/generate');
    expect(req.request.params.get('reportType')).toBe('BOOKING');
    expect(req.request.body.bookingStatus).toBe('PENDING');
    req.flush({ success: true, data: REPORT, message: null, error: null });
    expect(await promise).toEqual(REPORT);
  });

  it('generates a CANCELLATION report without ever sending a bookingStatus field', async () => {
    const { service, httpMock } = await setup();
    const promise = service.generateReport('CANCELLATION', { startDate: '2026-07-01', endDate: '2026-07-31' });
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/reports/generate');
    expect(req.request.body.bookingStatus).toBeUndefined();
    req.flush({ success: true, data: { ...REPORT, reportType: 'CANCELLATION' }, message: null, error: null });
    await promise;
  });

  it('exports a report as CSV using only the ReportExportRequest fields (no bookingStatus)', async () => {
    const { service, httpMock } = await setup();
    const promise = service.exportReport({ reportType: 'BOOKING', format: 'CSV', from: '2026-07-01', to: '2026-07-31' });
    const req = httpMock.expectOne('http://localhost:8080/api/reports/export');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reportType: 'BOOKING', format: 'CSV', from: '2026-07-01', to: '2026-07-31' });
    req.flush(new Blob(['bookingId,bookingReference\n1,BK1'], { type: 'text/csv' }));
    const result = await promise;
    expect(result.filename).toBe('booking_report.csv');
  });

  it('fetches report history', async () => {
    const { service, httpMock } = await setup();
    const promise = service.getReportHistory();
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/reports/history');
    req.flush({
      success: true,
      data: [{ id: 1, reportName: 'Booking Report', reportType: 'BOOKING', generatedAt: '2026-07-09T00:00:00', generatedBy: 'SYSTEM', appliedFilters: 'provider=101, bus=null, route=null, start=null, end=null', exportFormat: 'CSV', recordCount: 2, providerId: 101 }],
      message: null, error: null,
    });
    const history = await promise;
    expect(history[0].generatedBy).toBe('SYSTEM');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/app/features/transport/services/report.service.spec.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement models**

Create `frontend/src/app/features/transport/services/report.models.ts`:

```typescript
import { BookingStatus, ReportType } from '@app/features/transport/services/transport-enums';

export interface ReportGenerateFilters {
  startDate?: string;
  endDate?: string;
  busId?: number;
  routeId?: number;
  bookingStatus?: BookingStatus;
}

export interface ReportExportFilters {
  reportType: ReportType;
  format: 'CSV' | 'EXCEL';
  busId?: number;
  routeId?: number;
  from?: string;
  to?: string;
}

export interface ReportSummaryResponse {
  totalRecords: number;
  totalRevenue?: number;
  totalBookings?: number;
  totalPassengers?: number;
  totalCancellations?: number;
  fleetUtilization?: number;
  totalRefunds?: number;
}

export interface ReportResponse {
  reportName: string;
  reportType: string;
  generatedAt: string;
  generatedBy: string;
  summary: ReportSummaryResponse;
  data: Record<string, unknown>[];
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
  appliedFilters: Record<string, unknown>;
}

export interface ReportHistoryResponse {
  id: number;
  reportName: string;
  reportType: string;
  generatedAt: string;
  generatedBy: string;
  appliedFilters: string;
  exportFormat: string;
  recordCount: number;
  providerId: number;
}

export interface ExportedReportFile {
  blob: Blob;
  filename: string;
}
```

- [ ] **Step 4: Implement service**

Create `frontend/src/app/features/transport/services/report.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import { ReportType } from '@app/features/transport/services/transport-enums';
import {
  ExportedReportFile, ReportExportFilters, ReportGenerateFilters, ReportHistoryResponse, ReportResponse,
} from '@app/features/transport/services/report.models';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);

  generateReport(reportType: ReportType, filters: ReportGenerateFilters): Observable<ReportResponse> {
    const params = new HttpParams().set('reportType', reportType);
    return this.http
      .post<ApiResponse<ReportResponse>>(`${API_BASE_URL}/api/reports/generate`, filters, { params })
      .pipe(map((response) => response.data));
  }

  exportReport(filters: ReportExportFilters): Observable<ExportedReportFile> {
    const extension = filters.format === 'EXCEL' ? 'xlsx' : 'csv';
    const filename = `${filters.reportType.toLowerCase()}_report.${extension}`;
    return this.http
      .post(`${API_BASE_URL}/api/reports/export`, filters, { responseType: 'blob' })
      .pipe(map((blob) => ({ blob, filename })));
  }

  getReportHistory(reportType?: ReportType, from?: string, to?: string): Observable<ReportHistoryResponse[]> {
    let params = new HttpParams();
    if (reportType) params = params.set('reportType', reportType);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http
      .get<ApiResponse<ReportHistoryResponse[]>>(`${API_BASE_URL}/api/reports/history`, { params })
      .pipe(map((response) => response.data));
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/app/features/transport/services/report.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/transport/services/report.models.ts frontend/src/app/features/transport/services/report.service.ts frontend/src/app/features/transport/services/report.service.spec.ts
git commit -m "feat(transport): add Report models and service for generate/export/history"
```

---

### Task 22: Report Center tab + assemble `transport-reports` into Performance Analytics / Report Center tabs, nav label update

**Files:**
- Create: `frontend/src/app/features/transport/components/report-center-tab/report-center-tab.ts`
- Create: `frontend/src/app/features/transport/components/report-center-tab/report-center-tab.html`
- Create: `frontend/src/app/features/transport/components/report-center-tab/report-center-tab.spec.ts`
- Modify: `frontend/src/app/features/transport/components/transport-reports/transport-reports.ts` (replace dummy stats/chart content with the two-tab shell hosting `PerformanceAnalyticsTab` + `ReportCenterTab`)
- Modify: `frontend/src/app/features/transport/components/transport-reports/transport-reports.html`
- Create: `frontend/src/app/features/transport/components/transport-reports/transport-reports.spec.ts`
- Modify: `frontend/src/app/shared/layout/app-shell/app-shell.ts` (`NAV_MAP.transport`: label `'Reports'` → `'Reports & Analytics'`)
- Inspect before editing: current `transport-reports.ts`/`.html` (dummy `STATS` array + `weeklyBookingsBarOption` chart — both removed entirely, no loose remapping).

**Dynamic per-type filter visibility**, exactly the Task 21 table — driven by a lookup keyed by `ReportType`, not by displaying every filter for every type.
**Client-side pagination**: `ReportResponse.data` is paginated entirely in the component via `computed()` slicing over the full array — `page`/`size`/`totalPages` from the response are never read for slicing.
**Generated table columns**: derived from the union of keys across the whole `data` array (not row 0 only), stable order via `Object.keys` on a merged accumulator.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/features/transport/components/report-center-tab/report-center-tab.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ReportCenterTab } from '@app/features/transport/components/report-center-tab/report-center-tab';
import { ReportService } from '@app/features/transport/services/report.service';
import { ToastService } from '@app/core/toast/toast.service';

const REPORT = {
  reportName: 'Booking Report', reportType: 'BOOKING', generatedAt: '2026-07-09T00:00:00', generatedBy: 'SYSTEM',
  summary: { totalRecords: 2, totalBookings: 2 },
  data: [{ bookingId: 1, bookingReference: 'BK1' }, { bookingId: 2, route: 'BLR-GOA' }],
  page: 0, size: 50, totalRecords: 2, totalPages: 1, appliedFilters: {},
};

async function setup(reportService: Partial<ReportService>) {
  await TestBed.configureTestingModule({
    imports: [ReportCenterTab],
    providers: [
      { provide: ReportService, useValue: { getReportHistory: () => of([]), ...reportService } },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ReportCenterTab);
  fixture.detectChanges();
  return { fixture };
}

describe('ReportCenterTab', () => {
  it('shows only the filters proven consumed for the selected report type', async () => {
    const { fixture } = await setup({});
    fixture.componentInstance.selectedType.set('BUS_PERFORMANCE');
    expect(fixture.componentInstance.visibleFilters()).toEqual([]);

    fixture.componentInstance.selectedType.set('MAINTENANCE');
    expect(fixture.componentInstance.visibleFilters()).toEqual(['busId']);

    fixture.componentInstance.selectedType.set('REVENUE');
    expect(fixture.componentInstance.visibleFilters()).toEqual(['dateRange', 'busId', 'routeId', 'bookingStatus']);

    fixture.componentInstance.selectedType.set('CANCELLATION');
    expect(fixture.componentInstance.visibleFilters()).toEqual(['dateRange', 'busId', 'routeId']);
  });

  it('derives stable column order from the union of keys across the full data array, not just row 0', async () => {
    const { fixture } = await setup({ generateReport: () => of(REPORT) });
    fixture.componentInstance.generate();
    expect(fixture.componentInstance.columns()).toEqual(['bookingId', 'bookingReference', 'route']);
  });

  it('paginates client-side over the complete data array without trusting response.page/size/totalPages', async () => {
    const bigReport = { ...REPORT, data: Array.from({ length: 25 }, (_, i) => ({ bookingId: i })), page: 99, size: 999, totalPages: 1 };
    const { fixture } = await setup({ generateReport: () => of(bigReport) });
    fixture.componentInstance.pageSize.set(10);
    fixture.componentInstance.generate();
    expect(fixture.componentInstance.pagedRows().length).toBe(10);
    expect(fixture.componentInstance.totalClientPages()).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/app/features/transport/components/report-center-tab/report-center-tab.spec.ts`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement**

Create `frontend/src/app/features/transport/components/report-center-tab/report-center-tab.ts`:

```typescript
import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { ToastService } from '@app/core/toast/toast.service';
import { ReportService } from '@app/features/transport/services/report.service';
import { REPORT_TYPES, ReportType } from '@app/features/transport/services/transport-enums';
import { ReportGenerateFilters, ReportHistoryResponse, ReportResponse } from '@app/features/transport/services/report.models';

type FilterKey = 'dateRange' | 'busId' | 'routeId' | 'bookingStatus';

/**
 * Confirmed directly from every branch of ReportServiceImpl — driverId/
 * conductorId/tripStatus/paymentStatus/refundStatus are consumed by zero
 * branches and are never shown for any type.
 */
const VISIBLE_FILTERS: Record<ReportType, FilterKey[]> = {
  BOOKING: ['dateRange', 'busId', 'routeId', 'bookingStatus'],
  REVENUE: ['dateRange', 'busId', 'routeId', 'bookingStatus'],
  PASSENGER: ['dateRange', 'busId', 'routeId', 'bookingStatus'],
  CANCELLATION: ['dateRange', 'busId', 'routeId'],
  BUS_PERFORMANCE: [],
  ROUTE_PERFORMANCE: [],
  DRIVER_PERFORMANCE: [],
  CONDUCTOR_PERFORMANCE: [],
  FLEET_UTILIZATION: [],
  MAINTENANCE: ['busId'],
  REFUND: [],
};

@Component({
  selector: 'app-report-center-tab',
  imports: [HlmCardImports, HlmButtonImports, HlmTableImports, HlmSelectImports, HlmInputImports],
  templateUrl: './report-center-tab.html',
})
export class ReportCenterTab {
  private readonly reportService = inject(ReportService);
  private readonly toastService = inject(ToastService);

  public readonly reportTypes = REPORT_TYPES;
  public readonly selectedType = signal<ReportType>('BOOKING');
  public readonly filters = signal<ReportGenerateFilters>({});
  public readonly report = signal<ReportResponse | null>(null);
  public readonly generating = signal(false);

  public readonly currentPage = signal(0);
  public readonly pageSize = signal(20);

  public readonly history = signal<ReportHistoryResponse[]>([]);

  public readonly visibleFilters = computed<FilterKey[]>(() => VISIBLE_FILTERS[this.selectedType()]);

  public readonly columns = computed<string[]>(() => {
    const data = this.report()?.data ?? [];
    const keys: string[] = [];
    for (const row of data) {
      for (const key of Object.keys(row)) {
        if (!keys.includes(key)) keys.push(key);
      }
    }
    return keys;
  });

  public readonly pagedRows = computed(() => {
    const data = this.report()?.data ?? [];
    const start = this.currentPage() * this.pageSize();
    return data.slice(start, start + this.pageSize());
  });

  public readonly totalClientPages = computed(() => {
    const data = this.report()?.data ?? [];
    return Math.max(1, Math.ceil(data.length / this.pageSize()));
  });

  constructor() {
    this.loadHistory();
  }

  loadHistory(): void {
    this.reportService.getReportHistory().subscribe((history) => this.history.set(history));
  }

  generate(): void {
    this.generating.set(true);
    const effectiveFilters = this.selectedType() === 'CANCELLATION'
      ? { ...this.filters(), bookingStatus: undefined }
      : this.filters();
    this.reportService.generateReport(this.selectedType(), effectiveFilters).subscribe({
      next: (report) => {
        this.report.set(report);
        this.currentPage.set(0);
        this.generating.set(false);
        this.toastService.success('Report generated successfully.');
      },
      error: (err: HttpErrorResponse) => {
        this.generating.set(false);
        this.toastService.error(err.error?.error?.message ?? 'Failed to generate report.');
      },
    });
  }

  exportReport(format: 'CSV' | 'EXCEL'): void {
    const f = this.filters();
    this.reportService.exportReport({
      reportType: this.selectedType(), format, busId: f.busId, routeId: f.routeId, from: f.startDate, to: f.endDate,
    }).subscribe({
      next: ({ blob, filename }) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
        this.toastService.success('Report exported successfully.');
        this.loadHistory();
      },
      error: (err: HttpErrorResponse) => this.toastService.error(err.error?.error?.message ?? 'Failed to export report.'),
    });
  }
}
```

Create `frontend/src/app/features/transport/components/report-center-tab/report-center-tab.html`:

```html
<div hlmCard class="mb-4">
  <div hlmCardHeader><h3 hlmCardTitle>Generate Report</h3></div>
  <div hlmCardContent class="space-y-3">
    <select hlmSelect [value]="selectedType()" (change)="selectedType.set($any($event.target).value)">
      @for (t of reportTypes; track t) {
        <option [value]="t">{{ t }}</option>
      }
    </select>

    @if (visibleFilters().includes('dateRange')) {
      <div class="flex gap-2">
        <input hlmInput type="date" [value]="filters().startDate ?? ''" (change)="filters.set({ ...filters(), startDate: $any($event.target).value })" />
        <input hlmInput type="date" [value]="filters().endDate ?? ''" (change)="filters.set({ ...filters(), endDate: $any($event.target).value })" />
      </div>
    }
    @if (visibleFilters().includes('busId')) {
      <input hlmInput type="number" placeholder="Bus ID" [value]="filters().busId ?? ''" (change)="filters.set({ ...filters(), busId: $any($event.target).valueAsNumber })" />
    }
    @if (visibleFilters().includes('routeId')) {
      <input hlmInput type="number" placeholder="Route ID" [value]="filters().routeId ?? ''" (change)="filters.set({ ...filters(), routeId: $any($event.target).valueAsNumber })" />
    }
    @if (visibleFilters().includes('bookingStatus')) {
      <input hlmInput placeholder="Booking Status (optional)" [value]="filters().bookingStatus ?? ''" (change)="filters.set({ ...filters(), bookingStatus: $any($event.target).value })" />
    }

    <div class="flex gap-2">
      <button hlmBtn [disabled]="generating()" (click)="generate()">Generate</button>
      <button hlmBtn variant="outline" (click)="exportReport('CSV')">Export CSV</button>
      <button hlmBtn variant="outline" (click)="exportReport('EXCEL')">Export Excel</button>
    </div>
  </div>
</div>

@if (report(); as r) {
  <div hlmCard class="mb-4">
    <div hlmCardHeader><h3 hlmCardTitle>{{ r.reportName }}</h3></div>
    <div hlmCardContent class="text-sm space-y-1">
      <p>Generated At: {{ r.generatedAt }}</p>
      <p>Generated By: {{ r.generatedBy }}</p>
      <p>Total Records: {{ r.summary.totalRecords }}</p>
      @if (r.summary.totalRevenue != null) { <p>Total Revenue: ₹{{ r.summary.totalRevenue }}</p> }
    </div>
  </div>

  <div hlmCard class="mb-4">
    <div hlmCardContent>
      <table hlmTable>
        <thead hlmTHead>
          <tr hlmTr>
            @for (col of columns(); track col) { <th hlmTh>{{ col }}</th> }
          </tr>
        </thead>
        <tbody hlmTBody>
          @for (row of pagedRows(); track $index) {
            <tr hlmTr>
              @for (col of columns(); track col) { <td hlmTd>{{ row[col] ?? '—' }}</td> }
            </tr>
          }
        </tbody>
      </table>
      <div class="flex justify-between items-center mt-3 text-sm">
        <span>Page {{ currentPage() + 1 }} of {{ totalClientPages() }} (client-side pagination)</span>
        <div class="space-x-2">
          <button hlmBtn variant="ghost" size="sm" [disabled]="currentPage() === 0" (click)="currentPage.set(currentPage() - 1)">Previous</button>
          <button hlmBtn variant="ghost" size="sm" [disabled]="currentPage() + 1 >= totalClientPages()" (click)="currentPage.set(currentPage() + 1)">Next</button>
        </div>
      </div>
    </div>
  </div>
}

<div hlmCard>
  <div hlmCardHeader><h3 hlmCardTitle>Report History</h3></div>
  <div hlmCardContent>
    <table hlmTable>
      <thead hlmTHead><tr hlmTr><th hlmTh>Report</th><th hlmTh>Type</th><th hlmTh>Generated At</th><th hlmTh>Generated By</th><th hlmTh>Format</th><th hlmTh>Records</th></tr></thead>
      <tbody hlmTBody>
        @for (h of history(); track h.id) {
          <tr hlmTr>
            <td hlmTd>{{ h.reportName }}</td><td hlmTd>{{ h.reportType }}</td><td hlmTd>{{ h.generatedAt }}</td>
            <td hlmTd>{{ h.generatedBy }}</td><td hlmTd>{{ h.exportFormat }}</td><td hlmTd>{{ h.recordCount }}</td>
          </tr>
        } @empty {
          <tr hlmTr><td hlmTd colspan="6" class="text-muted-foreground">No reports generated yet.</td></tr>
        }
      </tbody>
    </table>
  </div>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/app/features/transport/components/report-center-tab/report-center-tab.spec.ts`
Expected: PASS.

- [ ] **Step 5: Assemble `transport-reports` into the two-tab shell**

Replace `frontend/src/app/features/transport/components/transport-reports/transport-reports.ts` in full (removes the dummy `STATS`/`weeklyBookingsBarOption` content entirely):

```typescript
import { Component } from '@angular/core';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { PerformanceAnalyticsTab } from '@app/features/transport/components/performance-analytics-tab/performance-analytics-tab';
import { ReportCenterTab } from '@app/features/transport/components/report-center-tab/report-center-tab';

@Component({
  selector: 'app-transport-reports',
  imports: [HlmTabsImports, PageHeader, PerformanceAnalyticsTab, ReportCenterTab],
  templateUrl: './transport-reports.html',
})
export class TransportReports {}
```

Replace `frontend/src/app/features/transport/components/transport-reports/transport-reports.html`:

```html
<app-page-header title="Reports & Analytics" subtitle="Operational performance and exportable reports." />

<div hlmTabs tab="performance">
  <div hlmTabsList aria-label="Reports sections">
    <button hlmTabsTrigger="performance">Performance Analytics</button>
    <button hlmTabsTrigger="reportCenter">Report Center</button>
  </div>
  <div hlmTabsContent="performance"><app-performance-analytics-tab /></div>
  <div hlmTabsContent="reportCenter"><app-report-center-tab /></div>
</div>
```

Create `frontend/src/app/features/transport/components/transport-reports/transport-reports.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TransportReports } from '@app/features/transport/components/transport-reports/transport-reports';
import { PerformanceAnalyticsService } from '@app/features/transport/services/performance-analytics.service';
import { ReportService } from '@app/features/transport/services/report.service';

describe('TransportReports', () => {
  it('renders both the Performance Analytics and Report Center tabs', async () => {
    await TestBed.configureTestingModule({
      imports: [TransportReports],
      providers: [
        { provide: PerformanceAnalyticsService, useValue: {
          getBusAnalytics: () => of([]), getRouteAnalytics: () => of([]), getDriverAnalytics: () => of([]),
          getConductorAnalytics: () => of([]), getMaintenanceAnalytics: () => of(null),
        } },
        { provide: ReportService, useValue: { getReportHistory: () => of([]) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(TransportReports);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Performance Analytics');
    expect(text).toContain('Report Center');
  });
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/app/features/transport/components/transport-reports/transport-reports.spec.ts`
Expected: PASS.

- [ ] **Step 7: Update the nav label**

In `frontend/src/app/shared/layout/app-shell/app-shell.ts`, `NAV_MAP.transport`, change:
```typescript
    { to: '/transport/reports', label: 'Reports', icon: 'lucideBarChart3' },
```
to:
```typescript
    { to: '/transport/reports', label: 'Reports & Analytics', icon: 'lucideBarChart3' },
```
(path unchanged — same nav slot, expanded content).

- [ ] **Step 8: Run the full transport suite to confirm no regression**

Run: `cd frontend && npx vitest run src/app/features/transport src/app/shared/layout/app-shell`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/app/features/transport/components/report-center-tab/ frontend/src/app/features/transport/components/transport-reports/ frontend/src/app/shared/layout/app-shell/app-shell.ts
git commit -m "feat(transport): assemble Reports & Analytics page with Performance Analytics and Report Center tabs"
```

**Phase 8 exit check:** `cd frontend && npx vitest run src/app/features/transport/services/performance-analytics.service.spec.ts src/app/features/transport/services/report.service.spec.ts src/app/features/transport/components/performance-analytics-tab src/app/features/transport/components/report-center-tab src/app/features/transport/components/transport-reports` — all green.

---

## Phase 9: Cleanup

### Task 23: Remove replaced Transport Provider mock-data exports and dead code

**Files:**
- Modify: `frontend/src/app/core/mock-data.ts` (remove `vehicles`, `partnerRoutes` exports only)
- Modify: `frontend/src/app/core/mock-data.spec.ts` (remove the two symbols from the import list and the `collections` array)

**Confirmed safe-to-remove scope** (grepped every importer across the whole frontend, not just the transport feature):
- `vehicles` — imported only by `manage-vehicles.ts` (rewritten in Task 8) and `transport-dashboard.ts` (rewritten in Task 6). No other role workspace imports it. Safe to remove.
- `partnerRoutes` — imported only by `manage-routes.ts` (deleted in Task 14) and `transport-dashboard.ts` (rewritten in Task 6), plus `mock-data.spec.ts` itself. No other role workspace imports it. Safe to remove.
- `transportPartners` — imported by `admin-partners.ts` (**Admin frontend, out of scope**) — **do not remove**.
- `routeAnalytics` — imported by `admin-route-analytics.ts` (**Admin frontend, out of scope**) — **do not remove**.
- `buses` — imported by `admin-buses.ts` (Admin) and `trip-travel-tab.ts` (Traveler) — **not Transport-Provider-specific at all, do not remove**.

No other frontend feature (traveler/hotel/activity/admin) is touched in this task.

- [ ] **Step 1: Confirm zero remaining references before deleting**

Run: `cd frontend && grep -rn "from '@app/core/mock-data'" src/app/features/transport/`
Expected: no output — by this point in the plan, every Transport Provider component has been rewritten (Phases 2–8) to call real services instead of `@app/core/mock-data`.

- [ ] **Step 2: Remove the two exports from `mock-data.ts`**

Open `frontend/src/app/core/mock-data.ts`, locate `export const vehicles = [...]` and `export const partnerRoutes = [...]`, and delete both full export statements (including their array contents).

- [ ] **Step 3: Update `mock-data.spec.ts`**

In `frontend/src/app/core/mock-data.spec.ts`, remove `vehicles,` and `partnerRoutes,` from the import list (lines 21-22) and remove the corresponding `vehicles,`/`partnerRoutes,` entries from the `collections` array (lines 53-54).

- [ ] **Step 4: Run the full test suite to confirm no dangling references**

Run: `cd frontend && npx vitest run`
Expected: PASS — no import errors from the removed exports anywhere in the suite.

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/core/mock-data.ts frontend/src/app/core/mock-data.spec.ts
git commit -m "chore(transport): remove vehicles/partnerRoutes mock data replaced by real backend integration"
```

**Phase 9 exit check:** `cd frontend && npx vitest run` and `cd frontend && npx tsc --noEmit` both clean.

---

## Phase 10: Final integration and validation

### Task 24: Full validation pass (build, live runtime matrix)

**Files:** none created/modified — this task is verification only.

- [ ] **Step 1: Full automated suite**

Run: `cd frontend && npx vitest run`
Expected: 0 failures across the entire suite (all prior phases' specs + every other untouched feature's existing specs).

- [ ] **Step 2: TypeScript strict compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors — confirms no dangling imports from any renamed/deleted component (`manage-routes`, `transport-bookings`) and correct typing across every new model/service.

- [ ] **Step 3: Production build**

Run: `cd frontend && npx ng build`
Expected: build succeeds with no new errors or warnings attributable to the Transport Provider feature.

- [ ] **Step 4: Start backend + frontend for live runtime verification**

Run backend: `cd backend && ./mvnw spring-boot:run` (background)
Run frontend: `cd frontend && npx ng serve` (background)

- [ ] **Step 5: Route/navigation reachability**

Manually verify (via browser or an E2E script if the project has one) that every one of the 7 nav entries in the Transport Provider sidebar (`Dashboard`, `Vehicles`, `Staff`, `Schedules`, `Bus Trips`, `Booking Analytics`, `Reports & Analytics`) navigates to a real, rendering page with no console errors.

- [ ] **Step 6: Auth flow — providerId persistence**

Log in as a seeded `ROLE_PROVIDER` (transport) account. Confirm `localStorage['te_user']` contains a non-null `providerId` matching the seeded value, sourced from the `LoginResponse.user.providerId` field (Task 1).

- [ ] **Step 7: 401 handling**

Manually expire/corrupt the stored token (e.g., edit `localStorage['te_access_token']` to an invalid value) and trigger any API call. Confirm: the app clears the session and redirects to `/login` (Task 3).

- [ ] **Step 8: 403 handling — no forced logout**

While authenticated as the transport provider, attempt a cross-provider mutation (e.g., `PUT /api/buses/{id}` for a bus ID known to belong to a different provider's seed data, via browser devtools or a manual API call). Confirm: a 403 is returned, a `ToastService.error` message appears, the user remains logged in, and no redirect occurs (Task 3).

- [ ] **Step 9: Cross-tenant isolation — Bus (Category 1)**

Confirm Manage Vehicles shows only the authenticated provider's own buses (`GET /api/buses?providerId=<own>`), not another seeded provider's fleet.

- [ ] **Step 10: Cross-tenant isolation — Schedules (client-side filter)**

Seed or confirm existing schedules belonging to a different provider exist. Confirm the Schedules page's client-side filter (Task 13/14) correctly excludes them from the rendered table, while `GET /api/schedules` itself (visible in Network tab) returns the full unfiltered set — proving the filter is applied in the frontend, not the backend.

- [ ] **Step 11: Cross-tenant isolation — Bus Trips (backend-scoped)**

Confirm the Bus Trips list only ever shows the authenticated provider's own trips, and that the raw `GET /api/operations/trips` network response itself is already scoped (no extra client-side filtering needed, unlike Schedules) — Task 15/16.

- [ ] **Step 12: Role denial**

Attempt to reach `/transport` (and any of its children) while authenticated as `ROLE_TRAVELER`, `ROLE_HOTEL_PROVIDER`, `ROLE_ACTIVITY_PROVIDER`, and `ROLE_ADMIN`. Confirm the existing `authGuard` (`data: { role: 'transport' }`) denies access for the first three, and confirm ROLE_ADMIN's actual behavior matches its own endpoint contracts (not copied ROLE_PROVIDER UI assumptions).

- [ ] **Step 13: Dashboard real data**

Confirm all 12 KPI cards, 3 charts, and fleet/staff/maintenance/top-route sections render real values from `GET /api/analytics/dashboard` — no dummy `partnerRoutes`/`vehicles` mock values remain anywhere on the page.

- [ ] **Step 14: Fleet CRUD**

Create, edit, and soft-delete a bus end-to-end through the UI. Confirm each action's Sonner toast (via `ToastService`) and confirm the deleted bus disappears from the list (soft-deleted, `BusStatus` presumably reflecting the backend's own soft-delete semantics).

- [ ] **Step 15: Maintenance lifecycle**

Schedule a maintenance record; confirm the owning bus flips to `MAINTENANCE` status on the Fleet tab. Walk it through `Start → Complete` and separately through `Start → Cancel` (two different records), confirming the bus flips back to `ACTIVE` in both terminal cases and that no action is offered on an already-`COMPLETED`/`CANCELLED` record.

- [ ] **Step 16: Driver/Conductor management**

Create a driver and a conductor (confirm no status field appears on create); edit each (confirm `licenseNumber`/`employeeId` is read-only on edit, status is editable to any of the 5 values); deactivate one of each (confirm the Deactivate action becomes disabled afterward, confirm no reactivation action is ever shown).

- [ ] **Step 17: Schedule create/edit/cancel + own-provider filtering**

Create a schedule against one of the provider's own `ACTIVE` buses and an `ACTIVE` admin route. Edit it and confirm the caution banner about `availableSeats` resetting is shown and that the reset actually happens (compare `availableSeats` before/after against the bus's `totalSeats`). Cancel it and confirm the Cancel action becomes disabled afterward.

- [ ] **Step 18: Bus Trip assignment + complete lifecycle graph**

Assign crew to a `SCHEDULED` schedule with and without a driver/conductor (confirming both are genuinely optional). Walk one trip through the full graph: `SCHEDULED → BOARDING → DEPARTED → RUNNING → DELAYED → ARRIVED → COMPLETED`, confirming at each step only the previously-documented valid action(s) are ever rendered, and confirming driver/conductor status flips correctly at `BOARDING` (`ON_TRIP`) and `COMPLETED` (`AVAILABLE`, trip counters incremented). Separately confirm `Cancel` is available and functions correctly from `ARRIVED`.

- [ ] **Step 19: Booking Analytics date-range behavior**

Apply a date range and confirm both the booking stat cards/charts and the revenue stat cards/charts update together from the same `from`/`to` values, and confirm no passenger-level table or fake passenger name ever appears anywhere on this page.

- [ ] **Step 20: Reports — Performance Analytics**

Confirm all four resource tables (Bus/Route/Driver/Conductor) and the Maintenance summary render real values with no client-side sort/size control (since the backend ignores those params).

- [ ] **Step 21: Report generation, per-type filter visibility**

For at least one report type per row of the Task 21/22 filter table (e.g., `BOOKING`, `REVENUE`, `CANCELLATION`, `BUS_PERFORMANCE`, `MAINTENANCE`), confirm the filter form shows exactly the documented fields and no others, and confirm the generated table's columns match the real returned data shape.

- [ ] **Step 22: CSV export**

Export a `BOOKING` report as CSV; confirm a `.csv` file downloads and opens with the expected columns.

- [ ] **Step 23: Excel export**

Export the same report as `EXCEL`; confirm a `.xlsx` file downloads and opens correctly.

- [ ] **Step 24: Report history**

Confirm the two exports above both appear as new rows in the Report History table with the correct `exportFormat`/`recordCount`, and confirm no "Download Again"/"Re-export" action exists anywhere.

- [ ] **Step 25: Mock-data removal confirmation**

Run: `cd frontend && grep -rn "from '@app/core/mock-data'" src/app/features/transport/`
Expected: no output.

- [ ] **Step 26: Zero backend changes confirmation**

Run: `cd backend && git status --short`
Expected: no output — confirms this entire plan touched zero backend files (this plan never instructs any `backend/` file to be created or modified, and this final check verifies that held true in practice).

- [ ] **Step 27: Stop background processes**

Stop the backend and frontend dev servers started in Step 4.

No commit for this task — it is a verification-only pass with no file changes.

**Phase 10 / plan exit check:** every step above passes; the Transport Provider frontend is fully integrated against the real backend with zero backend modifications, zero remaining Transport Provider mock data, and every lifecycle/tenant-scoping rule matching the approved spec exactly.

---
