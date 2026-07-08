# Trip Detail — Overview, Travel & Itinerary API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock data in `trip-detail` and its `overview`, `travel`, and `itinerary` tabs with real backend calls, following the design in `docs/superpowers/specs/2026-07-09-trip-detail-overview-travel-itinerary-api-integration-design.md`.

**Architecture:** Extend `TripsService` with two new methods; add four new Angular services (`ScheduleService`, `ActivitiesService`, `RecommendationsService`, `ItineraryService`) following the existing `TripsService`/`DestinationsService` pattern (`HttpClient` + `ApiResponse<T>` envelope unwrap via `.pipe(map(...))` for endpoints that use it, raw typed calls for the three endpoints that don't wrap their response). `trip-detail.ts` fetches the trip, its members, and the destination list once and passes `trip`/`members` down as inputs; each tab component fetches whatever additional data it alone needs, matching the existing `trip-members-tab` pattern of self-contained, independently-fetching tab components.

**Tech Stack:** Angular 19+ standalone components, signals (`signal`/`computed`/`input`), `HttpClient`, Vitest (`vi.fn()`), `HttpTestingController` for service specs.

## Global Constraints

- Every new/extended service method follows the existing unwrap pattern: `this.http.get<ApiResponse<T>>(url).pipe(map((r) => r.data))` for endpoints wrapped in the shared or busbooking `ApiResponse<T>` envelope. `GET /api/activities`, `GET /api/recommendations`, and all `/api/itinerary*` endpoints are **not** wrapped — call `this.http.get<T>(url)` directly for those.
- `API_BASE_URL` comes from `@app/core/api/api-config` (`'http://localhost:8080'`, no trailing `/api`); every URL is built as `` `${API_BASE_URL}/api/...` ``, matching `trips.service.ts`.
- No new UI elements, dialogs, or restyled components — only existing template bindings change from mock data to signals/inputs backed by real services. Where a real field doesn't exist (image, rating, price, "area", per-trip member count on `Trip` itself, bus "operator"), the same visual slot is either dropped or filled with the closest available real field, never left bound to something undefined.
- Every new/changed component keeps the existing loading → error → populated signal pattern used in `trip-members-tab.ts` (`loading`/`error` signals, `subscribe({ next, error })` in the constructor or `ngOnInit`).
- Every new service file gets a co-located `*.spec.ts` using `HttpTestingController`, mirroring `destinations.service.spec.ts`. Every rewritten component spec stubs its injected services with `{ provide: X, useValue: {...} }`, mirroring `trip-members-tab.spec.ts` — no `HttpTestingController` at the component level.
- Run tests via `ng test --include='<spec file>'` from the `frontend/` directory (this project's Angular `@angular/build:unit-test` builder wraps Vitest and resolves the `@app/*` path aliases and global test providers — invoking `vitest`/`npx vitest` directly does not resolve those aliases and will fail with "Cannot find package '@app/...'"). Confirmed empirically before writing this plan: `ng test --include='src/app/features/trips/components/trip-detail/trip-detail.spec.ts'` passes today; a raw `npx vitest run` on the same file fails to resolve `@app/core/mock-data`.
- Once `trip-detail.html`'s trip fetch resolves, all eight tab components mount together in the same pass (`hlmTabsContent` toggles CSS visibility between tabs, not `@if`/structural rendering — every tab's content is in the DOM regardless of which one is active), so every nested tab's `ngOnInit` runs during `TripDetail`'s own "populated" test scenarios. This means `trip-detail.spec.ts` (Task 6) must stub every service any nested tab touches (`ScheduleService`, `ActivitiesService`, `RecommendationsService`, `ItineraryService`, plus `TripsService.getBudgetSummary`), not just the ones `TripDetail` itself calls — otherwise those nested tabs fall through to real, unstubbed, `HttpClient`-backed services the moment the trip resolves in those tests.

---

### Task 1: `TripsService` — fetch a single trip and its budget summary

**Files:**
- Modify: `frontend/src/app/features/trips/services/trip.models.ts`
- Modify: `frontend/src/app/features/trips/services/trips.service.ts`
- Modify: `frontend/src/app/features/trips/services/trips.service.spec.ts`

**Interfaces:**
- Produces: `TripsService.getTripById(tripId: string): Observable<Trip>` — `GET /api/trips/{tripId}`.
- Produces: `TripsService.getBudgetSummary(tripId: string): Observable<BudgetSummary>` — `GET /api/trips/{tripId}/budget/summary`.
- Produces: `BudgetSummary` type in `trip.models.ts`: `{ tripId: string; totalBudget: number; totalSpent: number; remainingBudget: number; utilizationPercentage: number; overspent: boolean }`.

- [ ] **Step 1: Add the `BudgetSummary` type to `trip.models.ts`**

Add at the end of the file:

```ts
export interface BudgetSummary {
  tripId: string;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  utilizationPercentage: number;
  overspent: boolean;
}
```

- [ ] **Step 2: Write the failing tests for `getTripById` and `getBudgetSummary`**

Read `frontend/src/app/features/trips/services/trips.service.spec.ts` first to match its existing setup (it already has a `setup()`/similar bootstrap using `provideHttpClient()`/`provideHttpClientTesting()` — reuse whatever helper it already defines). Add these two `it` blocks inside the existing `describe('TripsService', ...)` block:

```ts
  it('fetches and unwraps a single trip by id', async () => {
    const { service, httpMock } = await setup();
    const sample: Trip = {
      tripId: 't1',
      tripName: 'Goa Trip',
      organizer: { userId: 'u1', name: 'Alice', email: 'alice@travelease.test' },
      sourceLocation: 'Bengaluru',
      destinationId: 2,
      budgetAmount: 40000,
      categoryId: 4,
      startDate: '2026-07-12',
      endDate: '2026-07-16',
      status: 'CONFIRMED',
      viewerRole: 'ORGANIZER',
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-01T00:00:00Z',
    };

    let result: Trip | undefined;
    service.getTripById('t1').subscribe((trip) => (result = trip));

    const req = httpMock.expectOne('http://localhost:8080/api/trips/t1');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: sample, message: 'ok', error: null });

    expect(result).toEqual(sample);
  });

  it('fetches and unwraps the trip budget summary', async () => {
    const { service, httpMock } = await setup();
    const summary: BudgetSummary = {
      tripId: 't1',
      totalBudget: 40000,
      totalSpent: 12000,
      remainingBudget: 28000,
      utilizationPercentage: 30,
      overspent: false,
    };

    let result: BudgetSummary | undefined;
    service.getBudgetSummary('t1').subscribe((s) => (result = s));

    const req = httpMock.expectOne('http://localhost:8080/api/trips/t1/budget/summary');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: summary, message: 'ok', error: null });

    expect(result).toEqual(summary);
  });
```

Add `BudgetSummary` to the existing `trip.models` import at the top of the spec file.

- [ ] **Step 3: Run the tests to verify they fail**

Run (from `frontend/`): `ng test --include='src/app/features/trips/services/trips.service.spec.ts'`
Expected: FAIL — `service.getTripById is not a function` / `service.getBudgetSummary is not a function`.

- [ ] **Step 4: Implement the two methods**

In `trips.service.ts`, add `Trip` and `BudgetSummary` to the `trip.models` import if not already present, then add inside the `TripsService` class:

```ts
  getTripById(tripId: string): Observable<Trip> {
    return this.http
      .get<ApiResponse<Trip>>(`${API_BASE_URL}/api/trips/${tripId}`)
      .pipe(map((response) => response.data));
  }

  getBudgetSummary(tripId: string): Observable<BudgetSummary> {
    return this.http
      .get<ApiResponse<BudgetSummary>>(`${API_BASE_URL}/api/trips/${tripId}/budget/summary`)
      .pipe(map((response) => response.data));
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `ng test --include='src/app/features/trips/services/trips.service.spec.ts'`
Expected: PASS, all tests including the two new ones.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/trips/services/trip.models.ts frontend/src/app/features/trips/services/trips.service.ts frontend/src/app/features/trips/services/trips.service.spec.ts
git commit -m "feat(trips): add getTripById and getBudgetSummary to TripsService"
```

---

### Task 2: `ScheduleService` — bus search and trip bus bookings

**Files:**
- Create: `frontend/src/app/features/trips/services/schedule.models.ts`
- Create: `frontend/src/app/features/trips/services/schedule.service.ts`
- Create: `frontend/src/app/features/trips/services/schedule.service.spec.ts`

**Interfaces:**
- Produces: `ScheduleService.searchBuses(source: string, destination: string, date: string): Observable<BusSearchResult[]>` — `GET /api/schedules/search?source=&destination=&date=`.
- Produces: `ScheduleService.getTripBusBookings(tripId: string): Observable<TripBusBookingSummary>` — `GET /api/trips/{tripId}/bus-bookings`.
- Produces types: `BusSearchResult`, `TripBusBooking`, `TripBusBookingSummary` in `schedule.models.ts`.

- [ ] **Step 1: Create `schedule.models.ts`**

```ts
export interface BusSearchResult {
  scheduleId: number;
  busName: string;
  busNumber: string;
  busType: string;
  source: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  fare: number;
  availableSeats: number;
  duration: number;
  travelDate: string;
  amenities: string[];
}

export type BusBookingStatus =
  | 'PENDING'
  | 'RESERVED'
  | 'CONFIRMED'
  | 'FAILED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'EXPIRED';

export interface TripBusBooking {
  bookingId: number;
  bookingReference: string;
  status: BusBookingStatus;
  totalFare: number;
  scheduleId: number;
  travelDate: string;
  source: string;
  destination: string;
  bookedByUserId: string;
  travelerTripId: string;
}

export interface TripBusBookingSummary {
  tripId: string;
  bookingCount: number;
  totalFare: number;
  bookings: TripBusBooking[];
}
```

- [ ] **Step 2: Write the failing service spec**

Create `frontend/src/app/features/trips/services/schedule.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ScheduleService } from '@app/features/trips/services/schedule.service';
import { BusSearchResult, TripBusBookingSummary } from '@app/features/trips/services/schedule.models';

async function setup() {
  await TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  return {
    service: TestBed.inject(ScheduleService),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('ScheduleService', () => {
  it('searches buses with source, destination and date as query params', async () => {
    const { service, httpMock } = await setup();
    const results: BusSearchResult[] = [
      {
        scheduleId: 1,
        busName: 'Volvo Multi-Axle',
        busNumber: 'KA-01-1234',
        busType: 'AC_SLEEPER',
        source: 'Bengaluru',
        destination: 'Goa',
        departureTime: '20:00:00',
        arrivalTime: '07:00:00',
        fare: 1800,
        availableSeats: 12,
        duration: 11,
        travelDate: '2026-07-12',
        amenities: ['WiFi'],
      },
    ];

    let result: BusSearchResult[] | undefined;
    service.searchBuses('Bengaluru', 'Goa', '2026-07-12').subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (r) =>
        r.url === 'http://localhost:8080/api/schedules/search' &&
        r.params.get('source') === 'Bengaluru' &&
        r.params.get('destination') === 'Goa' &&
        r.params.get('date') === '2026-07-12',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: results, message: 'ok', errors: null, status: 200, path: '/api/schedules/search' });

    expect(result).toEqual(results);
  });

  it('fetches and unwraps the trip bus booking summary', async () => {
    const { service, httpMock } = await setup();
    const summary: TripBusBookingSummary = { tripId: 't1', bookingCount: 0, totalFare: 0, bookings: [] };

    let result: TripBusBookingSummary | undefined;
    service.getTripBusBookings('t1').subscribe((r) => (result = r));

    const req = httpMock.expectOne('http://localhost:8080/api/trips/t1/bus-bookings');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: summary, message: 'ok', errors: null, status: 200, path: '/api/trips/t1/bus-bookings' });

    expect(result).toEqual(summary);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `ng test --include='src/app/features/trips/services/schedule.service.spec.ts'`
Expected: FAIL — cannot find module `@app/features/trips/services/schedule.service`.

- [ ] **Step 4: Implement `ScheduleService`**

Create `frontend/src/app/features/trips/services/schedule.service.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  BusSearchResult,
  TripBusBookingSummary,
} from '@app/features/trips/services/schedule.models';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly http = inject(HttpClient);

  searchBuses(source: string, destination: string, date: string): Observable<BusSearchResult[]> {
    const params = new HttpParams().set('source', source).set('destination', destination).set('date', date);
    return this.http
      .get<ApiResponse<BusSearchResult[]>>(`${API_BASE_URL}/api/schedules/search`, { params })
      .pipe(map((response) => response.data));
  }

  getTripBusBookings(tripId: string): Observable<TripBusBookingSummary> {
    return this.http
      .get<ApiResponse<TripBusBookingSummary>>(`${API_BASE_URL}/api/trips/${tripId}/bus-bookings`)
      .pipe(map((response) => response.data));
  }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `ng test --include='src/app/features/trips/services/schedule.service.spec.ts'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/trips/services/schedule.models.ts frontend/src/app/features/trips/services/schedule.service.ts frontend/src/app/features/trips/services/schedule.service.spec.ts
git commit -m "feat(trips): add ScheduleService for bus search and trip bus bookings"
```

---

### Task 3: `ActivitiesService` (core) — plain activity catalog by destination

**Files:**
- Create: `frontend/src/app/core/activities/activity.models.ts`
- Create: `frontend/src/app/core/activities/activities.service.ts`
- Create: `frontend/src/app/core/activities/activities.service.spec.ts`

**Interfaces:**
- Produces: `ActivitiesService.getActivities(destinationId: number): Observable<Activity[]>` — `GET /api/activities?destinationId=` (raw array response, **not** wrapped in `ApiResponse`).
- Produces: `Activity` type: `{ activityId: string; destinationId: number; activityName: string; durationHours: number; startTime: string; endTime: string; description: string }`.

- [ ] **Step 1: Create `activity.models.ts`**

```ts
export interface Activity {
  activityId: string;
  destinationId: number;
  activityName: string;
  durationHours: number;
  startTime: string;
  endTime: string;
  description: string;
}
```

- [ ] **Step 2: Write the failing service spec**

Create `frontend/src/app/core/activities/activities.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivitiesService } from '@app/core/activities/activities.service';
import { Activity } from '@app/core/activities/activity.models';

async function setup() {
  await TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  return {
    service: TestBed.inject(ActivitiesService),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('ActivitiesService', () => {
  it('fetches activities for a destination (raw array, no envelope)', async () => {
    const { service, httpMock } = await setup();
    const activities: Activity[] = [
      {
        activityId: 'a1',
        destinationId: 2,
        activityName: 'Scuba Diving',
        durationHours: 3,
        startTime: '09:00',
        endTime: '12:00',
        description: 'Guided scuba session',
      },
    ];

    let result: Activity[] | undefined;
    service.getActivities(2).subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (r) => r.url === 'http://localhost:8080/api/activities' && r.params.get('destinationId') === '2',
    );
    expect(req.request.method).toBe('GET');
    req.flush(activities);

    expect(result).toEqual(activities);
  });

  it('propagates an HTTP error', async () => {
    const { service, httpMock } = await setup();

    let errored = false;
    service.getActivities(2).subscribe({ error: () => (errored = true) });

    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/activities');
    req.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

    expect(errored).toBe(true);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `ng test --include='src/app/core/activities/activities.service.spec.ts'`
Expected: FAIL — cannot find module `@app/core/activities/activities.service`.

- [ ] **Step 4: Implement `ActivitiesService`**

Create `frontend/src/app/core/activities/activities.service.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { Activity } from '@app/core/activities/activity.models';

@Injectable({ providedIn: 'root' })
export class ActivitiesService {
  private readonly http = inject(HttpClient);

  getActivities(destinationId: number): Observable<Activity[]> {
    const params = new HttpParams().set('destinationId', destinationId);
    return this.http.get<Activity[]>(`${API_BASE_URL}/api/activities`, { params });
  }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `ng test --include='src/app/core/activities/activities.service.spec.ts'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/core/activities/activity.models.ts frontend/src/app/core/activities/activities.service.ts frontend/src/app/core/activities/activities.service.spec.ts
git commit -m "feat(activities): add ActivitiesService for the destination activity catalog"
```

---

### Task 4: `RecommendationsService` (core) — recommendations by traveler category

**Files:**
- Create: `frontend/src/app/core/recommendations/recommendation.models.ts`
- Create: `frontend/src/app/core/recommendations/recommendations.service.ts`
- Create: `frontend/src/app/core/recommendations/recommendations.service.spec.ts`

**Interfaces:**
- Produces: `RecommendationsService.getRecommendations(categoryId: number): Observable<Recommendation[]>` — `GET /api/recommendations?categoryId=` (raw array, not wrapped).
- Produces: `Recommendation` type: `{ recommendationId: string; categoryId: number; recommendationType: string; referenceId: string; rankOrder: number }`.

- [ ] **Step 1: Create `recommendation.models.ts`**

```ts
export interface Recommendation {
  recommendationId: string;
  categoryId: number;
  recommendationType: string;
  referenceId: string;
  rankOrder: number;
}
```

- [ ] **Step 2: Write the failing service spec**

Create `frontend/src/app/core/recommendations/recommendations.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RecommendationsService } from '@app/core/recommendations/recommendations.service';
import { Recommendation } from '@app/core/recommendations/recommendation.models';

async function setup() {
  await TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  return {
    service: TestBed.inject(RecommendationsService),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('RecommendationsService', () => {
  it('fetches recommendations for a category (raw array, no envelope)', async () => {
    const { service, httpMock } = await setup();
    const recommendations: Recommendation[] = [
      { recommendationId: 'r1', categoryId: 4, recommendationType: 'Activity', referenceId: 'a1', rankOrder: 1 },
    ];

    let result: Recommendation[] | undefined;
    service.getRecommendations(4).subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (r) => r.url === 'http://localhost:8080/api/recommendations' && r.params.get('categoryId') === '4',
    );
    expect(req.request.method).toBe('GET');
    req.flush(recommendations);

    expect(result).toEqual(recommendations);
  });

  it('propagates an HTTP error', async () => {
    const { service, httpMock } = await setup();

    let errored = false;
    service.getRecommendations(4).subscribe({ error: () => (errored = true) });

    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/recommendations');
    req.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

    expect(errored).toBe(true);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `ng test --include='src/app/core/recommendations/recommendations.service.spec.ts'`
Expected: FAIL — cannot find module `@app/core/recommendations/recommendations.service`.

- [ ] **Step 4: Implement `RecommendationsService`**

Create `frontend/src/app/core/recommendations/recommendations.service.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { Recommendation } from '@app/core/recommendations/recommendation.models';

@Injectable({ providedIn: 'root' })
export class RecommendationsService {
  private readonly http = inject(HttpClient);

  getRecommendations(categoryId: number): Observable<Recommendation[]> {
    const params = new HttpParams().set('categoryId', categoryId);
    return this.http.get<Recommendation[]>(`${API_BASE_URL}/api/recommendations`, { params });
  }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `ng test --include='src/app/core/recommendations/recommendations.service.spec.ts'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/core/recommendations/recommendation.models.ts frontend/src/app/core/recommendations/recommendations.service.ts frontend/src/app/core/recommendations/recommendations.service.spec.ts
git commit -m "feat(recommendations): add RecommendationsService for category-based recommendations"
```

---

### Task 5: `ItineraryService` — day-wise itinerary CRUD and progress

**Files:**
- Create: `frontend/src/app/features/trips/services/itinerary.models.ts`
- Create: `frontend/src/app/features/trips/services/itinerary.service.ts`
- Create: `frontend/src/app/features/trips/services/itinerary.service.spec.ts`

**Interfaces:**
- Produces: `ItineraryService.list(tripId: string): Observable<ItineraryItem[]>` — `GET /api/itinerary?tripId=`.
- Produces: `ItineraryService.create(payload: CreateItineraryPayload): Observable<ItineraryItem>` — `POST /api/itinerary`.
- Produces: `ItineraryService.update(itineraryId: string, payload: CreateItineraryPayload): Observable<ItineraryItem>` — `PUT /api/itinerary/{itineraryId}`.
- Produces: `ItineraryService.remove(itineraryId: string): Observable<void>` — `DELETE /api/itinerary/{itineraryId}`.
- Produces: `ItineraryService.getProgress(tripId: string): Observable<ItineraryProgress>` — `GET /api/itinerary/progress?tripId=`.
- Produces types: `ItineraryStatus`, `ItineraryItem`, `CreateItineraryPayload`, `ItineraryProgress`.

- [ ] **Step 1: Create `itinerary.models.ts`**

```ts
export type ItineraryStatus = 'Pending' | 'Completed';

export interface ItineraryItem {
  itineraryId: string;
  tripId: string;
  activityId: string;
  activityName: string;
  activityDate: string;
  startTime: string | null;
  endTime: string | null;
  status: ItineraryStatus;
  completionTime: string | null;
}

export interface CreateItineraryPayload {
  tripId: string;
  activityId: string;
  activityDate: string;
  status: ItineraryStatus;
}

export interface ItineraryProgress {
  tripId: string;
  totalActivities: number;
  completedActivities: number;
  pendingActivities: number;
  completionPercentage: number;
}
```

- [ ] **Step 2: Write the failing service spec**

Create `frontend/src/app/features/trips/services/itinerary.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ItineraryService } from '@app/features/trips/services/itinerary.service';
import {
  CreateItineraryPayload,
  ItineraryItem,
  ItineraryProgress,
} from '@app/features/trips/services/itinerary.models';

async function setup() {
  await TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  return {
    service: TestBed.inject(ItineraryService),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

const SAMPLE_ITEM: ItineraryItem = {
  itineraryId: 'i1',
  tripId: 't1',
  activityId: 'a1',
  activityName: 'Scuba Diving',
  activityDate: '2026-07-13',
  startTime: null,
  endTime: null,
  status: 'Pending',
  completionTime: null,
};

describe('ItineraryService', () => {
  it('lists itinerary items for a trip (raw array, no envelope)', async () => {
    const { service, httpMock } = await setup();

    let result: ItineraryItem[] | undefined;
    service.list('t1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (r) => r.url === 'http://localhost:8080/api/itinerary' && r.params.get('tripId') === 't1',
    );
    expect(req.request.method).toBe('GET');
    req.flush([SAMPLE_ITEM]);

    expect(result).toEqual([SAMPLE_ITEM]);
  });

  it('creates an itinerary item', async () => {
    const { service, httpMock } = await setup();
    const payload: CreateItineraryPayload = {
      tripId: 't1',
      activityId: 'a1',
      activityDate: '2026-07-13',
      status: 'Pending',
    };

    let result: ItineraryItem | undefined;
    service.create(payload).subscribe((r) => (result = r));

    const req = httpMock.expectOne('http://localhost:8080/api/itinerary');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(SAMPLE_ITEM);

    expect(result).toEqual(SAMPLE_ITEM);
  });

  it('fetches itinerary progress for a trip', async () => {
    const { service, httpMock } = await setup();
    const progress: ItineraryProgress = {
      tripId: 't1',
      totalActivities: 4,
      completedActivities: 4,
      pendingActivities: 0,
      completionPercentage: 100,
    };

    let result: ItineraryProgress | undefined;
    service.getProgress('t1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (r) => r.url === 'http://localhost:8080/api/itinerary/progress' && r.params.get('tripId') === 't1',
    );
    expect(req.request.method).toBe('GET');
    req.flush(progress);

    expect(result).toEqual(progress);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `ng test --include='src/app/features/trips/services/itinerary.service.spec.ts'`
Expected: FAIL — cannot find module `@app/features/trips/services/itinerary.service`.

- [ ] **Step 4: Implement `ItineraryService`**

Create `frontend/src/app/features/trips/services/itinerary.service.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import {
  CreateItineraryPayload,
  ItineraryItem,
  ItineraryProgress,
} from '@app/features/trips/services/itinerary.models';

@Injectable({ providedIn: 'root' })
export class ItineraryService {
  private readonly http = inject(HttpClient);

  list(tripId: string): Observable<ItineraryItem[]> {
    const params = new HttpParams().set('tripId', tripId);
    return this.http.get<ItineraryItem[]>(`${API_BASE_URL}/api/itinerary`, { params });
  }

  create(payload: CreateItineraryPayload): Observable<ItineraryItem> {
    return this.http.post<ItineraryItem>(`${API_BASE_URL}/api/itinerary`, payload);
  }

  update(itineraryId: string, payload: CreateItineraryPayload): Observable<ItineraryItem> {
    return this.http.put<ItineraryItem>(`${API_BASE_URL}/api/itinerary/${itineraryId}`, payload);
  }

  remove(itineraryId: string): Observable<void> {
    return this.http
      .delete<{ message: string }>(`${API_BASE_URL}/api/itinerary/${itineraryId}`)
      .pipe(map(() => undefined));
  }

  getProgress(tripId: string): Observable<ItineraryProgress> {
    const params = new HttpParams().set('tripId', tripId);
    return this.http.get<ItineraryProgress>(`${API_BASE_URL}/api/itinerary/progress`, { params });
  }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `ng test --include='src/app/features/trips/services/itinerary.service.spec.ts'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/trips/services/itinerary.models.ts frontend/src/app/features/trips/services/itinerary.service.ts frontend/src/app/features/trips/services/itinerary.service.spec.ts
git commit -m "feat(itinerary): add ItineraryService for day-wise itinerary CRUD and progress"
```

---

### Task 6: `trip-detail` — fetch the real trip, members, and destination name

**Files:**
- Modify: `frontend/src/app/features/trips/components/trip-detail/trip-detail.ts`
- Modify: `frontend/src/app/features/trips/components/trip-detail/trip-detail.html`
- Modify: `frontend/src/app/features/trips/components/trip-detail/trip-detail.spec.ts`

**Interfaces:**
- Consumes: `TripsService.getTripById`, `TripsService.getTripMembers` (existing), `DestinationsService.listDestinations` (existing, from Task 1 and the pre-existing services).
- Produces: `trip = signal<Trip | null>(null)`, `members = signal<TripMember[]>([])`, both passed as inputs `[trip]`/`[members]` to `app-trip-overview-tab` and `app-trip-travel-tab`; `[trip]` also now passed to `app-trip-itinerary-tab` (previously received no input).

- [ ] **Step 1: Write the failing test**

Replace the entire contents of `frontend/src/app/features/trips/components/trip-detail/trip-detail.spec.ts`:

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
import { Subject, of, throwError } from 'rxjs';
import { TripDetail } from '@app/features/trips/components/trip-detail/trip-detail';
import { TripsService } from '@app/features/trips/services/trips.service';
import { ScheduleService } from '@app/features/trips/services/schedule.service';
import { ItineraryService } from '@app/features/trips/services/itinerary.service';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { ActivitiesService } from '@app/core/activities/activities.service';
import { RecommendationsService } from '@app/core/recommendations/recommendations.service';
import { Trip, TripMember } from '@app/features/trips/services/trip.models';
import { Destination } from '@app/core/destinations/destination.models';
import { UsersService } from '@app/core/users/users.service';

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

const SAMPLE_TRIP: Trip = {
  tripId: 'goa-2026',
  tripName: 'Goa Beach Escape',
  organizer: { userId: 'u1', name: 'Alice', email: 'alice@travelease.test' },
  sourceLocation: 'Bengaluru',
  destinationId: 2,
  budgetAmount: 40000,
  categoryId: 4,
  startDate: '2026-07-12',
  endDate: '2026-07-16',
  status: 'CONFIRMED',
  viewerRole: 'ORGANIZER',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

const SAMPLE_MEMBERS: TripMember[] = [
  {
    tripMemberId: 'm1',
    userId: 'u2',
    name: 'Bob',
    email: 'bob@travelease.test',
    memberStatus: 'ACCEPTED',
    joinedDate: '2026-06-02T00:00:00Z',
    budgetAmount: 0,
    spentAmount: 0,
  },
];

const SAMPLE_DESTINATIONS: Destination[] = [
  { destinationId: 2, destinationName: 'Goa', state: 'Goa', country: 'India', description: '' },
];

async function renderWithTripId(
  tripId: string | null,
  queryParams: Record<string, string> = {},
  overrides: Partial<TripsService> = {},
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
      {
        provide: TripsService,
        useValue: {
          getTripById: () => of(SAMPLE_TRIP),
          getTripMembers: () => of(SAMPLE_MEMBERS),
          getBudgetSummary: () =>
            of({
              tripId: 'goa-2026',
              totalBudget: 40000,
              totalSpent: 0,
              remainingBudget: 40000,
              utilizationPercentage: 0,
              overspent: false,
            }),
          ...overrides,
        },
      },
      { provide: DestinationsService, useValue: { listDestinations: () => of(SAMPLE_DESTINATIONS) } },
      { provide: UsersService, useValue: { searchTravelers: () => of([]) } },
      // TripDetail's template renders every tab eagerly (not just the active
      // one), so the Overview/Travel/Itinerary tabs' own ngOnInit fetches run
      // unconditionally during fixture.detectChanges() below. Without these
      // stubs they'd fall through to the real, HttpClient-backed services and
      // either throw (methods missing from a partial stub) or fire real
      // network calls against http://localhost:8080 during this component's
      // tests, which only care about TripDetail's own hero/tabs behavior.
      {
        provide: ScheduleService,
        useValue: {
          searchBuses: () => of([]),
          getTripBusBookings: () => of({ tripId: 'goa-2026', bookingCount: 0, totalFare: 0, bookings: [] }),
        },
      },
      { provide: ActivitiesService, useValue: { getActivities: () => of([]) } },
      { provide: RecommendationsService, useValue: { getRecommendations: () => of([]) } },
      {
        provide: ItineraryService,
        useValue: {
          list: () => of([]),
          create: () => of(null),
          getProgress: () =>
            of({
              tripId: 'goa-2026',
              totalActivities: 0,
              completedActivities: 0,
              pendingActivities: 0,
              completionPercentage: 0,
            }),
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(TripDetail);
  fixture.detectChanges();
  return fixture;
}

function activeTab(fixture: ReturnType<typeof TestBed.createComponent<TripDetail>>): string {
  return (fixture.componentInstance as unknown as { activeTab: () => string }).activeTab();
}

describe('TripDetail', () => {
  it('shows a loading message before the trip arrives', async () => {
    const subject = new Subject<Trip>();
    const fixture = await renderWithTripId('goa-2026', {}, { getTripById: () => subject.asObservable() });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading trip');
  });

  it('fetches the trip matching the route tripId and renders its name', async () => {
    const fixture = await renderWithTripId('goa-2026');
    expect(fixture.componentInstance.trip()).toEqual(SAMPLE_TRIP);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Goa Beach Escape');
  });

  it('shows an error message when loading the trip fails', async () => {
    const fixture = await renderWithTripId(
      'goa-2026',
      {},
      { getTripById: () => throwError(() => new Error('boom')) },
    );
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Something went wrong');
  });

  it('resolves the destination id to a name in the hero', async () => {
    const fixture = await renderWithTripId('goa-2026');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Goa');
  });

  it('shows the member count in the hero', async () => {
    const fixture = await renderWithTripId('goa-2026');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('1 members');
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

  it('defaults activeTab to overview when no tab query param is present', async () => {
    const fixture = await renderWithTripId('goa-2026');
    expect(activeTab(fixture)).toBe('overview');
  });

  it('seeds activeTab from a recognized tab query param', async () => {
    const fixture = await renderWithTripId('goa-2026', { tab: 'members' });
    expect(activeTab(fixture)).toBe('members');
  });

  it('falls back to overview for an unrecognized tab query param value', async () => {
    const fixture = await renderWithTripId('goa-2026', { tab: 'not-a-real-tab' });
    expect(activeTab(fixture)).toBe('overview');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `ng test --include='src/app/features/trips/components/trip-detail/trip-detail.spec.ts'`
Expected: FAIL — `fixture.componentInstance.trip()` is not the resolved `Trip`, "Loading trip" text not found, mock `trips`/`totalBudget`/`pct` references no longer compile.

- [ ] **Step 3: Rewrite `trip-detail.ts`**

Replace the entire file:

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
import { DestinationPill } from '@app/shared/ui/destination-pill/destination-pill';
import { TripsService } from '@app/features/trips/services/trips.service';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { Trip, TripMember } from '@app/features/trips/services/trip.models';
import { TripOverviewTab } from './tabs/trip-overview-tab/trip-overview-tab';
import { TripMembersTab } from './tabs/trip-members-tab/trip-members-tab';
import { TripTravelTab } from './tabs/trip-travel-tab/trip-travel-tab';
import { TripAccommodationTab } from './tabs/trip-accommodation-tab/trip-accommodation-tab';
import { TripExpensesTab } from './tabs/trip-expenses-tab/trip-expenses-tab';
import { TripItineraryTab } from './tabs/trip-itinerary-tab/trip-itinerary-tab';
import { TripAlertsTab } from './tabs/trip-alerts-tab/trip-alerts-tab';
import { TripReviewsTab } from './tabs/trip-reviews-tab/trip-reviews-tab';

const TRAVELER_CATEGORY_LABELS: Record<number, string> = {
  1: 'Solo',
  2: 'Couple',
  3: 'Family',
  4: 'Friends',
  5: 'Corporate',
};

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
    DestinationPill,
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
  private readonly tripsService = inject(TripsService);
  private readonly destinationsService = inject(DestinationsService);

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
    this.route.paramMap.pipe(map((params) => params.get('tripId') ?? '')),
    { initialValue: '' },
  );

  public readonly trip = signal<Trip | null>(null);
  protected readonly members = signal<TripMember[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly destinationNames = signal<Map<number, string>>(new Map());

  protected readonly categoryLabel = computed(() => {
    const trip = this.trip();
    return trip ? (TRAVELER_CATEGORY_LABELS[trip.categoryId] ?? 'Trip') : '';
  });

  constructor() {
    this.tripsService.getTripById(this.tripId()).subscribe({
      next: (trip) => {
        this.trip.set(trip);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Something went wrong loading this trip. Please try again.');
        this.loading.set(false);
      },
    });

    this.tripsService.getTripMembers(this.tripId()).subscribe({
      next: (members) => this.members.set(members),
      error: () => {
        // Member count is a hero enhancement, not required to view the trip.
      },
    });

    this.destinationsService.listDestinations().subscribe({
      next: (destinations) => {
        this.destinationNames.set(new Map(destinations.map((d) => [d.destinationId, d.destinationName])));
      },
      error: () => {
        // Same fallback approach as trip-list.ts — falls back to "Destination #<id>".
      },
    });
  }

  protected destinationLabel(destinationId: number): string {
    return this.destinationNames().get(destinationId) ?? `Destination #${destinationId}`;
  }
}
```

- [ ] **Step 4: Rewrite `trip-detail.html`**

Replace the entire file:

```html
@if (loading()) {
  <p class="text-sm text-muted-foreground py-8 text-center">Loading trip…</p>
} @else if (error()) {
  <p class="text-sm text-destructive py-8 text-center">{{ error() }}</p>
} @else if (trip(); as trip) {
  <a hlmBtn variant="ghost" size="sm" class="mb-3" routerLink="/trips">
    <ng-icon name="lucideArrowLeft" class="h-4 w-4 mr-1" />All trips
  </a>

  <div class="relative rounded-2xl overflow-hidden mb-6 h-56">
    <img
      src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=60"
      alt=""
      class="absolute inset-0 h-full w-full object-cover"
    />
    <div class="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"></div>
    <div class="relative h-full flex flex-col justify-end p-6 text-white">
      <div class="flex items-center gap-2 mb-2">
        <app-status-badge [status]="trip.status" />
        <span hlmBadge variant="outline" class="bg-white/15 backdrop-blur border-white/30 text-white">{{
          categoryLabel()
        }}</span>
      </div>
      <h1 class="text-3xl font-semibold">{{ trip.tripName }}</h1>
      <div class="flex flex-wrap items-center gap-4 mt-2 text-sm opacity-90">
        <app-destination-pill [from]="trip.sourceLocation" [to]="destinationLabel(trip.destinationId)" />
        <span
          ><ng-icon name="lucideCalendar" class="inline h-4 w-4 mr-1" />{{ trip.startDate }} →
          {{ trip.endDate }}</span
        >
        <span><ng-icon name="lucideUsers" class="inline h-4 w-4 mr-1" />{{ members().length }} members</span>
      </div>
    </div>
  </div>

  <div hlmTabs [tab]="activeTab()" (tabActivated)="activeTab.set($event)" class="w-full">
    <div hlmTabsList class="bg-muted/50 p-1 h-auto flex-wrap">
      @for (t of tabs; track t.id) {
        <button [hlmTabsTrigger]="t.id" class="capitalize">{{ t.label }}</button>
      }
    </div>

    <div [hlmTabsContent]="'overview'" class="mt-6">
      <app-trip-overview-tab [trip]="trip" [members]="members()" />
    </div>

    <div [hlmTabsContent]="'members'" class="mt-6">
      <app-trip-members-tab />
    </div>

    <div [hlmTabsContent]="'travel'" class="mt-6">
      <app-trip-travel-tab [trip]="trip" [members]="members()" />
    </div>

    <div [hlmTabsContent]="'accommodation'" class="mt-6">
      <app-trip-accommodation-tab />
    </div>

    <div [hlmTabsContent]="'expenses'" class="mt-6">
      <app-trip-expenses-tab />
    </div>

    <div [hlmTabsContent]="'itinerary'" class="mt-6">
      <app-trip-itinerary-tab [trip]="trip" />
    </div>

    <div [hlmTabsContent]="'alerts'" class="mt-6">
      <app-trip-alerts-tab />
    </div>

    <div [hlmTabsContent]="'reviews'" class="mt-6">
      <app-trip-reviews-tab />
    </div>
  </div>
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `ng test --include='src/app/features/trips/components/trip-detail/trip-detail.spec.ts'`
Expected: FAIL at this point specifically on the tab-content tests, because `TripOverviewTab`/`TripTravelTab`/`TripItineraryTab` don't yet accept the new inputs (Tasks 7–9 fix this) — confirm the failures are only inside those three child components' own input binding, not in `TripDetail`'s own logic (loading/error/hero/tabs tests should already pass). This is expected and resolved by the next three tasks.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/trips/components/trip-detail/trip-detail.ts frontend/src/app/features/trips/components/trip-detail/trip-detail.html frontend/src/app/features/trips/components/trip-detail/trip-detail.spec.ts
git commit -m "feat(trip-detail): fetch the real trip, members, and destination name"
```

---

### Task 7: `trip-overview-tab` — real stats, budget meter, timeline, recommendations

**Files:**
- Modify: `frontend/src/app/features/trips/components/trip-detail/tabs/trip-overview-tab/trip-overview-tab.ts`
- Modify: `frontend/src/app/features/trips/components/trip-detail/tabs/trip-overview-tab/trip-overview-tab.html`
- Modify: `frontend/src/app/features/trips/components/trip-detail/tabs/trip-overview-tab/trip-overview-tab.spec.ts`

**Interfaces:**
- Consumes: `trip = input.required<Trip>()`, `members = input.required<TripMember[]>()` (from Task 6); `TripsService.getBudgetSummary`, `ScheduleService.getTripBusBookings`, `ItineraryService.getProgress`, `RecommendationsService.getRecommendations`, `ActivitiesService.getActivities`.
- Produces: no outputs consumed elsewhere — this is a leaf tab.

- [ ] **Step 1: Write the failing test**

Replace the entire contents of `frontend/src/app/features/trips/components/trip-detail/tabs/trip-overview-tab/trip-overview-tab.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import {
  lucideAlertTriangle,
  lucideCheckCircle2,
  lucidePlus,
  lucideSparkles,
  lucideUsers,
  lucideWallet,
} from '@ng-icons/lucide';
import { of } from 'rxjs';
import { TripOverviewTab } from '@app/features/trips/components/trip-detail/tabs/trip-overview-tab/trip-overview-tab';
import { TripsService } from '@app/features/trips/services/trips.service';
import { ScheduleService } from '@app/features/trips/services/schedule.service';
import { ItineraryService } from '@app/features/trips/services/itinerary.service';
import { ActivitiesService } from '@app/core/activities/activities.service';
import { RecommendationsService } from '@app/core/recommendations/recommendations.service';
import { Trip, TripMember, BudgetSummary } from '@app/features/trips/services/trip.models';

const TRIP: Trip = {
  tripId: 't1',
  tripName: 'Test Trip',
  organizer: { userId: 'u1', name: 'Alice', email: 'alice@travelease.test' },
  sourceLocation: 'Bengaluru',
  destinationId: 2,
  budgetAmount: 40000,
  categoryId: 4,
  startDate: '2026-07-12',
  endDate: '2026-07-16',
  status: 'CONFIRMED',
  viewerRole: 'ORGANIZER',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

const MEMBERS: TripMember[] = [
  {
    tripMemberId: 'm1',
    userId: 'u2',
    name: 'Bob',
    email: 'bob@travelease.test',
    memberStatus: 'ACCEPTED',
    joinedDate: '2026-06-02T00:00:00Z',
    budgetAmount: 0,
    spentAmount: 0,
  },
];

const SUMMARY: BudgetSummary = {
  tripId: 't1',
  totalBudget: 40000,
  totalSpent: 10000,
  remainingBudget: 30000,
  utilizationPercentage: 25,
  overspent: false,
};

async function render(overrides: {
  budgetSummary?: BudgetSummary;
  busBookingCount?: number;
  completionPercentage?: number;
} = {}) {
  await TestBed.configureTestingModule({
    imports: [TripOverviewTab],
    providers: [
      provideIcons({
        lucideAlertTriangle,
        lucideCheckCircle2,
        lucidePlus,
        lucideSparkles,
        lucideUsers,
        lucideWallet,
      }),
      {
        provide: TripsService,
        useValue: { getBudgetSummary: () => of(overrides.budgetSummary ?? SUMMARY) },
      },
      {
        provide: ScheduleService,
        useValue: {
          getTripBusBookings: () =>
            of({ tripId: 't1', bookingCount: overrides.busBookingCount ?? 0, totalFare: 0, bookings: [] }),
        },
      },
      {
        provide: ItineraryService,
        useValue: {
          getProgress: () =>
            of({
              tripId: 't1',
              totalActivities: 4,
              completedActivities: overrides.completionPercentage === 100 ? 4 : 0,
              pendingActivities: 0,
              completionPercentage: overrides.completionPercentage ?? 0,
            }),
        },
      },
      { provide: RecommendationsService, useValue: { getRecommendations: () => of([]) } },
      { provide: ActivitiesService, useValue: { getActivities: () => of([]) } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(TripOverviewTab);
  fixture.componentRef.setInput('trip', TRIP);
  fixture.componentRef.setInput('members', MEMBERS);
  fixture.detectChanges();
  return fixture;
}

interface TimelineStep {
  label: string;
  done: boolean;
  date: string;
}

function timelineSteps(fixture: ReturnType<typeof TestBed.createComponent<TripOverviewTab>>): TimelineStep[] {
  return (fixture.componentInstance as unknown as { timelineSteps: () => TimelineStep[] }).timelineSteps();
}

describe('TripOverviewTab', () => {
  it('renders the 5 stat cards from the members input and the budget summary', async () => {
    const fixture = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Total Members');
    expect(text).toContain('1');
    expect(text).toContain('₹40,000');
    expect(text).toContain('₹10,000');
    expect(text).toContain('CONFIRMED');
  });

  it('shows the budget warning when utilizationPercentage is over 80', async () => {
    const fixture = await render({
      budgetSummary: { ...SUMMARY, utilizationPercentage: 95 },
    });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Budget nearing limit');
  });

  it('hides the budget warning when utilizationPercentage is 80 or under', async () => {
    const fixture = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Budget nearing limit');
  });

  it('marks Bus Booked done when the trip has at least one bus booking', async () => {
    const fixture = await render({ busBookingCount: 1 });
    const steps = timelineSteps(fixture);
    expect(steps.find((s) => s.label === 'Bus Booked')?.done).toBe(true);
  });

  it('marks Itinerary Finalized done only at 100% completion', async () => {
    const fixture = await render({ completionPercentage: 100 });
    const steps = timelineSteps(fixture);
    expect(steps.find((s) => s.label === 'Itinerary Finalized')?.done).toBe(true);
  });

  it('does not include a Hotel Selected timeline step', async () => {
    const fixture = await render();
    const steps = timelineSteps(fixture);
    expect(steps.some((s) => s.label === 'Hotel Selected')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `ng test --include='src/app/features/trips/components/trip-detail/tabs/trip-overview-tab/trip-overview-tab.spec.ts'`
Expected: FAIL — `timelineSteps` isn't a function yet, `totalBudget`/`pct` inputs required by the old component don't exist in this test, stat text doesn't match yet.

- [ ] **Step 3: Rewrite `trip-overview-tab.ts`**

Replace the entire file:

```ts
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { TripsService } from '@app/features/trips/services/trips.service';
import { ScheduleService } from '@app/features/trips/services/schedule.service';
import { ItineraryService } from '@app/features/trips/services/itinerary.service';
import { ActivitiesService } from '@app/core/activities/activities.service';
import { Activity } from '@app/core/activities/activity.models';
import { RecommendationsService } from '@app/core/recommendations/recommendations.service';
import { BudgetSummary, Trip, TripMember } from '@app/features/trips/services/trip.models';

interface TimelineStep {
  label: string;
  done: boolean;
  date: string;
}

interface StatCard {
  label: string;
  value: string;
  icon: string;
}

interface RecommendedActivityCard {
  id: string;
  name: string;
  duration: string;
}

@Component({
  selector: 'app-trip-overview-tab',
  imports: [NgIcon, HlmCardImports, HlmButtonImports, HlmBadgeImports, HlmProgressImports],
  templateUrl: './trip-overview-tab.html',
})
export class TripOverviewTab implements OnInit {
  public readonly trip = input.required<Trip>();
  public readonly members = input.required<TripMember[]>();

  private readonly tripsService = inject(TripsService);
  private readonly scheduleService = inject(ScheduleService);
  private readonly itineraryService = inject(ItineraryService);
  private readonly activitiesService = inject(ActivitiesService);
  private readonly recommendationsService = inject(RecommendationsService);

  protected readonly budgetSummary = signal<BudgetSummary | null>(null);
  protected readonly busBooked = signal(false);
  protected readonly itineraryFinalized = signal(false);
  protected readonly recommendedActivities = signal<RecommendedActivityCard[]>([]);

  protected readonly pct = computed(() => Math.round(this.budgetSummary()?.utilizationPercentage ?? 0));

  protected readonly stats = computed<StatCard[]>(() => {
    const trip = this.trip();
    const summary = this.budgetSummary();
    return [
      { label: 'Total Members', value: String(this.members().length), icon: 'lucideUsers' },
      {
        label: 'Trip Budget',
        value: `₹${(summary?.totalBudget ?? trip.budgetAmount).toLocaleString()}`,
        icon: 'lucideWallet',
      },
      { label: 'Current Cost', value: `₹${(summary?.totalSpent ?? 0).toLocaleString()}`, icon: 'lucideWallet' },
      {
        label: 'Remaining',
        value: `₹${(summary?.remainingBudget ?? trip.budgetAmount).toLocaleString()}`,
        icon: 'lucideWallet',
      },
      { label: 'Status', value: trip.status, icon: 'lucideCheckCircle2' },
    ];
  });

  protected readonly timelineSteps = computed<TimelineStep[]>(() => {
    const trip = this.trip();
    const membersAccepted = this.members().some((m) => m.memberStatus === 'ACCEPTED');
    const tripStarted = new Date(trip.startDate).getTime() <= Date.now();
    return [
      { label: 'Trip Created', done: true, date: trip.createdAt },
      { label: 'Members Invited', done: membersAccepted, date: trip.startDate },
      { label: 'Bus Booked', done: this.busBooked(), date: trip.startDate },
      { label: 'Itinerary Finalized', done: this.itineraryFinalized(), date: trip.startDate },
      { label: 'Trip Begins', done: tripStarted, date: trip.startDate },
    ];
  });

  ngOnInit(): void {
    const trip = this.trip();

    this.tripsService.getBudgetSummary(trip.tripId).subscribe({
      next: (summary) => this.budgetSummary.set(summary),
      error: () => {
        // Falls back to trip.budgetAmount in the stats/computed above.
      },
    });

    this.scheduleService.getTripBusBookings(trip.tripId).subscribe({
      next: (summary) => this.busBooked.set(summary.bookingCount > 0),
      error: () => {
        // Stays "not done" — a fair default when we can't confirm a booking.
      },
    });

    this.itineraryService.getProgress(trip.tripId).subscribe({
      next: (progress) => this.itineraryFinalized.set(progress.completionPercentage === 100),
      error: () => {
        // Stays "not done".
      },
    });

    this.recommendationsService.getRecommendations(trip.categoryId).subscribe({
      next: (recommendations) => {
        const activityRefIds = recommendations
          .filter((r) => r.recommendationType === 'Activity')
          .map((r) => r.referenceId);
        if (activityRefIds.length === 0) {
          return;
        }
        this.activitiesService.getActivities(trip.destinationId).subscribe({
          next: (activities) => {
            const byId = new Map(activities.map((a) => [a.activityId, a]));
            this.recommendedActivities.set(
              activityRefIds
                .map((id) => byId.get(id))
                .filter((a): a is Activity => !!a)
                .slice(0, 4)
                .map((a) => ({ id: a.activityId, name: a.activityName, duration: `${a.durationHours} hr` })),
            );
          },
          error: () => {
            // Recommended activities section just stays empty.
          },
        });
      },
      error: () => {
        // Recommended activities section just stays empty.
      },
    });
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  }
}
```

- [ ] **Step 4: Rewrite `trip-overview-tab.html`**

Replace the entire file:

```html
<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
  @for (s of stats(); track s.label) {
    <div hlmCard>
      <div hlmCardContent class="pt-5">
        <ng-icon [name]="s.icon" class="h-4 w-4 text-primary mb-2" />
        <p class="text-xs text-muted-foreground">{{ s.label }}</p>
        <p class="text-lg font-semibold mt-1 capitalize">{{ s.value }}</p>
      </div>
    </div>
  }
</div>

<div class="grid lg:grid-cols-3 gap-6 mt-6">
  <div hlmCard class="lg:col-span-2">
    <div hlmCardHeader><h3 hlmCardTitle>Trip Timeline</h3></div>
    <div hlmCardContent>
      <div class="space-y-4">
        @for (step of timelineSteps(); track step.label; let last = $last; let i = $index) {
          <div class="flex gap-4">
            <div class="flex flex-col items-center">
              <div
                class="h-7 w-7 rounded-full grid place-items-center text-xs font-medium"
                [class]="step.done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground border'"
              >
                @if (step.done) {
                  <ng-icon name="lucideCheckCircle2" class="h-4 w-4" />
                } @else {
                  {{ i + 1 }}
                }
              </div>
              @if (!last) {
                <div class="w-px flex-1" [class]="step.done ? 'bg-primary/30' : 'bg-border'"></div>
              }
            </div>
            <div class="pb-4">
              <p class="font-medium text-sm">{{ step.label }}</p>
              <p class="text-xs text-muted-foreground">{{ formatDate(step.date) }}</p>
            </div>
          </div>
        }
      </div>
    </div>
  </div>

  <div hlmCard>
    <div hlmCardHeader><h3 hlmCardTitle>Budget Meter</h3></div>
    <div hlmCardContent class="space-y-4">
      <div class="text-center py-2">
        <div class="text-3xl font-semibold tabular-nums">{{ pct() }}%</div>
        <p class="text-xs text-muted-foreground">of total budget used</p>
      </div>
      <hlm-progress [value]="pct()" class="h-3"><hlm-progress-indicator /></hlm-progress>
      <div class="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p class="text-muted-foreground">Total</p>
          <p class="font-semibold">₹{{ ((budgetSummary()?.totalBudget ?? trip().budgetAmount) / 1000).toFixed(0) }}k</p>
        </div>
        <div>
          <p class="text-muted-foreground">Spent</p>
          <p class="font-semibold">₹{{ ((budgetSummary()?.totalSpent ?? 0) / 1000).toFixed(1) }}k</p>
        </div>
        <div>
          <p class="text-muted-foreground">Left</p>
          <p class="font-semibold text-success">
            ₹{{ ((budgetSummary()?.remainingBudget ?? trip().budgetAmount) / 1000).toFixed(1) }}k
          </p>
        </div>
      </div>
      @if (pct() > 80) {
        <div class="flex gap-2 p-3 rounded-md bg-warning/10 text-[oklch(0.40_0.12_75)] text-xs">
          <ng-icon name="lucideAlertTriangle" class="h-4 w-4 shrink-0" /> Budget nearing limit —
          review pending expenses.
        </div>
      }
    </div>
  </div>
</div>

<div hlmCard class="mt-6">
  <div hlmCardHeader class="flex flex-row items-center justify-between">
    <div>
      <h3 hlmCardTitle class="flex items-center gap-2">
        <ng-icon name="lucideSparkles" class="h-4 w-4 text-accent" />Recommended Activities
      </h3>
      <p class="text-xs text-muted-foreground mt-1">
        Hand-picked based on your destination and travel dates.
      </p>
    </div>
  </div>
  <div hlmCardContent>
    @if (recommendedActivities().length === 0) {
      <p class="text-sm text-muted-foreground py-4">No recommendations yet for this destination.</p>
    } @else {
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        @for (a of recommendedActivities(); track a.id) {
          <div class="rounded-lg border overflow-hidden bg-card">
            <div class="relative h-28 grid place-items-center bg-muted/40">
              <ng-icon name="lucideSparkles" class="h-8 w-8 text-muted-foreground" />
            </div>
            <div class="p-3 space-y-1.5">
              <p class="font-medium text-sm">{{ a.name }}</p>
              <p class="text-xs text-muted-foreground">{{ a.duration }}</p>
              <div class="flex items-center justify-end pt-1">
                <button hlmBtn size="sm" variant="outline" class="h-7 text-xs">
                  <ng-icon name="lucidePlus" class="h-3 w-3 mr-1" />Add
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    }
  </div>
</div>
```

- [ ] **Step 5: Run to verify it passes**

Run: `ng test --include='src/app/features/trips/components/trip-detail/tabs/trip-overview-tab/trip-overview-tab.spec.ts'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/trips/components/trip-detail/tabs/trip-overview-tab/
git commit -m "feat(trip-overview-tab): wire stats, budget meter, timeline, and recommendations to real data"
```

---

### Task 8: `trip-travel-tab` — real bus search and already-attached bookings

**Files:**
- Modify: `frontend/src/app/features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab.ts`
- Modify: `frontend/src/app/features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab.html`
- Modify: `frontend/src/app/features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab.spec.ts`

**Interfaces:**
- Consumes: `trip = input.required<Trip>()`, `members = input.required<TripMember[]>()` (from Task 6); `ScheduleService.searchBuses`, `ScheduleService.getTripBusBookings`, `DestinationsService.listDestinations`.

- [ ] **Step 1: Write the failing test**

Replace the entire contents of `frontend/src/app/features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { lucideAlertTriangle, lucideArrowRight, lucideBus, lucideSparkles } from '@ng-icons/lucide';
import { of } from 'rxjs';
import { TripTravelTab } from '@app/features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab';
import { ScheduleService } from '@app/features/trips/services/schedule.service';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { Trip, TripMember } from '@app/features/trips/services/trip.models';
import { BusSearchResult } from '@app/features/trips/services/schedule.models';

const TRIP: Trip = {
  tripId: 't1',
  tripName: 'Test Trip',
  organizer: { userId: 'u1', name: 'Alice', email: 'alice@travelease.test' },
  sourceLocation: 'Bengaluru',
  destinationId: 2,
  budgetAmount: 40000,
  categoryId: 4,
  startDate: '2026-07-12',
  endDate: '2026-07-16',
  status: 'CONFIRMED',
  viewerRole: 'ORGANIZER',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

const RESULTS: BusSearchResult[] = [
  {
    scheduleId: 1,
    busName: 'Volvo Multi-Axle',
    busNumber: 'KA-01-1234',
    busType: 'AC_SLEEPER',
    source: 'Bengaluru',
    destination: 'Goa',
    departureTime: '20:00:00',
    arrivalTime: '07:00:00',
    fare: 1800,
    availableSeats: 4,
    duration: 11,
    travelDate: '2026-07-12',
    amenities: [],
  },
];

async function render(members: TripMember[], searchBuses = () => of(RESULTS)) {
  await TestBed.configureTestingModule({
    imports: [TripTravelTab],
    providers: [
      provideIcons({ lucideAlertTriangle, lucideArrowRight, lucideBus, lucideSparkles }),
      {
        provide: ScheduleService,
        useValue: {
          searchBuses,
          getTripBusBookings: () => of({ tripId: 't1', bookingCount: 0, totalFare: 0, bookings: [] }),
        },
      },
      {
        provide: DestinationsService,
        useValue: {
          listDestinations: () =>
            of([{ destinationId: 2, destinationName: 'Goa', state: 'Goa', country: 'India', description: '' }]),
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(TripTravelTab);
  fixture.componentRef.setInput('trip', TRIP);
  fixture.componentRef.setInput('members', members);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('TripTravelTab', () => {
  it('auto-searches on load using the trip source/destination/date and renders results', async () => {
    const searchBuses = vi.fn().mockReturnValue(of(RESULTS));
    const fixture = await render([], searchBuses);

    expect(searchBuses).toHaveBeenCalledWith('Bengaluru', 'Goa', '2026-07-12');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Volvo Multi-Axle');
  });

  it('shows the Suitable for Group badge when the trip has few members', async () => {
    const members: TripMember[] = [
      {
        tripMemberId: 'm1',
        userId: 'u2',
        name: 'Bob',
        email: 'bob@travelease.test',
        memberStatus: 'ACCEPTED',
        joinedDate: '2026-06-02T00:00:00Z',
        budgetAmount: 0,
        spentAmount: 0,
      },
    ];
    const fixture = await render(members);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Suitable for Group');
  });

  it('hides the Suitable for Group badge when the trip has more members than any bus has seats', async () => {
    const members: TripMember[] = Array.from({ length: 10 }, (_, i) => ({
      tripMemberId: `m${i}`,
      userId: `u${i}`,
      name: `Member ${i}`,
      email: `m${i}@travelease.test`,
      memberStatus: 'ACCEPTED' as const,
      joinedDate: '2026-06-02T00:00:00Z',
      budgetAmount: 0,
      spentAmount: 0,
    }));
    const fixture = await render(members);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Suitable for Group');
  });

  it('renders exactly 30 seats in the allocation grid', async () => {
    const fixture = await render([]);
    expect(fixture.componentInstance.seats).toHaveLength(30);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `ng test --include='src/app/features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab.spec.ts'`
Expected: FAIL — `trip`/`members` inputs don't exist yet on the mock-based component, `ScheduleService`/`DestinationsService` aren't injected.

- [ ] **Step 3: Rewrite `trip-travel-tab.ts`**

Replace the entire file:

```ts
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { ScheduleService } from '@app/features/trips/services/schedule.service';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { BusSearchResult, TripBusBooking } from '@app/features/trips/services/schedule.models';
import { Trip, TripMember } from '@app/features/trips/services/trip.models';

interface SeatInfo {
  index: number;
  booked: boolean;
  selected: boolean;
  recommended: boolean;
}

const BOOKED_SEATS = [2, 5, 7, 11, 14, 18, 22, 25];
const SELECTED_SEATS = [12, 13, 17, 19];
const RECOMMENDED_SEATS = [12, 13, 17, 19, 8, 9];
const SELECTED_SEAT_LABELS = ['13', '14', '18', '20'];

const SEATS: SeatInfo[] = Array.from({ length: 30 }, (_, i) => ({
  index: i,
  booked: BOOKED_SEATS.includes(i),
  selected: SELECTED_SEATS.includes(i),
  recommended: RECOMMENDED_SEATS.includes(i),
}));

@Component({
  selector: 'app-trip-travel-tab',
  imports: [NgIcon, HlmCardImports, HlmButtonImports, HlmBadgeImports, HlmInputImports, HlmLabelImports],
  templateUrl: './trip-travel-tab.html',
})
export class TripTravelTab implements OnInit {
  public readonly trip = input.required<Trip>();
  public readonly members = input.required<TripMember[]>();

  private readonly scheduleService = inject(ScheduleService);
  private readonly destinationsService = inject(DestinationsService);

  protected readonly destinationName = signal('');
  protected readonly results = signal<BusSearchResult[]>([]);
  protected readonly searching = signal(true);
  protected readonly searchError = signal<string | null>(null);
  protected readonly tripBookings = signal<TripBusBooking[]>([]);

  public readonly seats = SEATS;
  protected readonly selectedSeatLabels = SELECTED_SEAT_LABELS;

  ngOnInit(): void {
    const trip = this.trip();

    this.destinationsService.listDestinations().subscribe({
      next: (destinations) => {
        const match = destinations.find((d) => d.destinationId === trip.destinationId);
        const name = match?.destinationName ?? '';
        this.destinationName.set(name);
        this.runSearch(trip.sourceLocation, name, trip.startDate);
      },
      error: () => this.searching.set(false),
    });

    this.scheduleService.getTripBusBookings(trip.tripId).subscribe({
      next: (summary) => this.tripBookings.set(summary.bookings),
      error: () => {
        // "Already booked" list just stays empty.
      },
    });
  }

  protected onSearch(source: string, destination: string, date: string): void {
    this.runSearch(source, destination, date);
  }

  protected suitableForGroup(bus: BusSearchResult): boolean {
    return bus.availableSeats >= this.members().length;
  }

  private runSearch(source: string, destination: string, date: string): void {
    if (!source || !destination || !date) {
      this.searching.set(false);
      return;
    }
    this.searching.set(true);
    this.searchError.set(null);
    this.scheduleService.searchBuses(source, destination, date).subscribe({
      next: (results) => {
        this.results.set(results);
        this.searching.set(false);
      },
      error: () => {
        this.searchError.set('Something went wrong searching buses. Please try again.');
        this.searching.set(false);
      },
    });
  }
}
```

- [ ] **Step 4: Rewrite `trip-travel-tab.html`**

Replace the entire file:

```html
<div hlmCard>
  <div hlmCardHeader><h3 hlmCardTitle>Search Buses</h3></div>
  <div hlmCardContent>
    <div class="grid md:grid-cols-4 gap-3">
      <div class="space-y-1.5">
        <label hlmLabel for="source">Source</label>
        <input hlmInput id="source" [value]="trip().sourceLocation" #sourceInput />
      </div>
      <div class="space-y-1.5">
        <label hlmLabel for="destination">Destination</label>
        <input hlmInput id="destination" [value]="destinationName()" #destinationInput />
      </div>
      <div class="space-y-1.5">
        <label hlmLabel for="date">Date</label>
        <input hlmInput id="date" type="date" [value]="trip().startDate" #dateInput />
      </div>
      <div class="flex items-end">
        <button hlmBtn class="w-full" (click)="onSearch(sourceInput.value, destinationInput.value, dateInput.value)">
          Search
        </button>
      </div>
    </div>
  </div>
</div>

<div class="space-y-3 mt-6">
  @if (searching()) {
    <p class="text-sm text-muted-foreground py-4">Searching buses…</p>
  } @else if (searchError()) {
    <p class="text-sm text-destructive py-4">{{ searchError() }}</p>
  } @else if (results().length === 0) {
    <p class="text-sm text-muted-foreground py-4">No buses found for this route and date.</p>
  } @else {
    @for (b of results(); track b.scheduleId) {
      <div hlmCard>
        <div hlmCardContent class="pt-5 grid md:grid-cols-12 gap-4 items-center">
          <div class="md:col-span-4">
            <div class="flex items-center gap-2">
              <ng-icon name="lucideBus" class="h-4 w-4 text-primary" />
              <h3 class="font-semibold">{{ b.busName }}</h3>
            </div>
            <p class="text-sm text-muted-foreground">{{ b.busNumber }} · {{ b.busType }}</p>
            @if (suitableForGroup(b)) {
              <span hlmBadge variant="outline" class="mt-2 bg-success/15 text-success border-success/20">
                <ng-icon name="lucideSparkles" class="h-3 w-3 mr-1" />Suitable for Group
              </span>
            }
          </div>
          <div class="md:col-span-4 flex items-center gap-3 text-sm">
            <div>
              <p class="font-medium tabular-nums">{{ b.departureTime }}</p>
              <p class="text-xs text-muted-foreground">{{ b.source }}</p>
            </div>
            <ng-icon name="lucideArrowRight" class="h-4 w-4 text-muted-foreground" />
            <div>
              <p class="font-medium tabular-nums">{{ b.arrivalTime }}</p>
              <p class="text-xs text-muted-foreground">{{ b.destination }}</p>
            </div>
          </div>
          <div class="md:col-span-2 text-sm">
            <p class="text-muted-foreground text-xs">{{ b.availableSeats }} seats left</p>
          </div>
          <div class="md:col-span-2 flex flex-col items-end gap-2">
            <p class="text-lg font-semibold">₹{{ b.fare }}</p>
            <div class="flex gap-2">
              <button hlmBtn variant="outline" size="sm" disabled>View Seats</button>
              <button hlmBtn size="sm" disabled>Select</button>
            </div>
          </div>
        </div>
      </div>
    }
  }
</div>

@if (tripBookings().length > 0) {
  <div class="mt-6 space-y-3">
    <h3 class="font-semibold text-sm text-muted-foreground">Already booked for this trip</h3>
    @for (b of tripBookings(); track b.bookingId) {
      <div hlmCard>
        <div hlmCardContent class="pt-5 flex items-center justify-between gap-4">
          <div>
            <p class="font-medium">{{ b.bookingReference }}</p>
            <p class="text-xs text-muted-foreground">{{ b.source }} → {{ b.destination }} · {{ b.travelDate }}</p>
          </div>
          <div class="text-right">
            <p class="font-semibold">₹{{ b.totalFare }}</p>
            <p class="text-xs text-muted-foreground">{{ b.status }}</p>
          </div>
        </div>
      </div>
    }
  </div>
}

<div hlmCard class="mt-6">
  <div hlmCardHeader><h3 hlmCardTitle>Seat Allocation — Volvo Multi-Axle Sleeper</h3></div>
  <div hlmCardContent>
    <div class="flex flex-col md:flex-row gap-6">
      <div class="rounded-xl border bg-muted/20 p-5">
        <p class="text-xs text-muted-foreground mb-3 text-center">Driver</p>
        <div class="grid grid-cols-5 gap-2">
          @for (seat of seats; track seat.index) {
            <div
              class="h-8 w-8 rounded-md border grid place-items-center text-[10px] font-medium"
              [class]="
                seat.booked
                  ? 'bg-muted text-muted-foreground border-border'
                  : seat.selected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : seat.recommended
                      ? 'bg-accent/20 border-accent text-accent'
                      : 'bg-card border-border'
              "
            >
              {{ seat.index + 1 }}
            </div>
          }
        </div>
        <div class="flex gap-4 mt-4 text-xs text-muted-foreground">
          <span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-card border"></span>Available</span>
          <span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-muted border"></span>Booked</span>
          <span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-primary"></span>Selected</span>
          <span class="flex items-center gap-1.5"
            ><span class="h-3 w-3 rounded bg-accent/30 border border-accent"></span>Recommended</span
          >
        </div>
      </div>
      <div class="flex-1 space-y-3">
        <div>
          <p class="text-sm font-medium mb-2">Selected Seats</p>
          <div class="flex gap-2 flex-wrap">
            @for (s of selectedSeatLabels; track s) {
              <span hlmBadge variant="outline" class="border-primary text-primary">Seat {{ s }}</span>
            }
          </div>
        </div>
        <div class="p-3 rounded-md bg-warning/10 flex gap-2 text-sm text-[oklch(0.40_0.12_75)]">
          <ng-icon name="lucideAlertTriangle" class="h-4 w-4 shrink-0 mt-0.5" />
          <span>Group may be split — only 2 adjacent pairs available. Consider Volvo at 22:00 for 6 consecutive seats.</span>
        </div>
        <div class="flex justify-between items-center pt-3 border-t">
          <div>
            <p class="text-xs text-muted-foreground">Total · 4 seats</p>
            <p class="text-lg font-semibold">₹7,400</p>
          </div>
          <button hlmBtn disabled>Proceed</button>
        </div>
      </div>
    </div>
  </div>
</div>
```

The template above uses `lucideAlertTriangle` in the Seat Allocation warning banner, which always renders (it's not behind an `@if`). Add `lucideAlertTriangle` to the spec's `provideIcons` call in Step 1 alongside `lucideArrowRight`, `lucideBus`, `lucideMapPin`, `lucideSparkles`, or the test run in Step 5 will fail with a missing-icon error.

- [ ] **Step 5: Run to verify it passes**

Run: `ng test --include='src/app/features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab.spec.ts'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/trips/components/trip-detail/tabs/trip-travel-tab/
git commit -m "feat(trip-travel-tab): wire bus search and trip bus bookings to real data"
```

---

### Task 9: `trip-itinerary-tab` — real day-wise itinerary and activity catalog

**Files:**
- Modify: `frontend/src/app/features/trips/components/trip-detail/tabs/trip-itinerary-tab/trip-itinerary-tab.ts`
- Modify: `frontend/src/app/features/trips/components/trip-detail/tabs/trip-itinerary-tab/trip-itinerary-tab.html`
- Modify: `frontend/src/app/features/trips/components/trip-detail/tabs/trip-itinerary-tab/trip-itinerary-tab.spec.ts`

**Interfaces:**
- Consumes: `trip = input.required<Trip>()` (from Task 6); `ActivitiesService.getActivities`, `ItineraryService.list`, `ItineraryService.create`.

- [ ] **Step 1: Write the failing test**

Replace the entire contents of `frontend/src/app/features/trips/components/trip-detail/tabs/trip-itinerary-tab/trip-itinerary-tab.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { lucideClock, lucidePlus, lucideSparkles } from '@ng-icons/lucide';
import { of } from 'rxjs';
import { TripItineraryTab } from '@app/features/trips/components/trip-detail/tabs/trip-itinerary-tab/trip-itinerary-tab';
import { ActivitiesService } from '@app/core/activities/activities.service';
import { ItineraryService } from '@app/features/trips/services/itinerary.service';
import { Activity } from '@app/core/activities/activity.models';
import { ItineraryItem } from '@app/features/trips/services/itinerary.models';
import { Trip } from '@app/features/trips/services/trip.models';

const TRIP: Trip = {
  tripId: 't1',
  tripName: 'Test Trip',
  organizer: { userId: 'u1', name: 'Alice', email: 'alice@travelease.test' },
  sourceLocation: 'Bengaluru',
  destinationId: 2,
  budgetAmount: 40000,
  categoryId: 4,
  startDate: '2026-07-12',
  endDate: '2026-07-16',
  status: 'CONFIRMED',
  viewerRole: 'ORGANIZER',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

const ACTIVITIES: Activity[] = [
  {
    activityId: 'a1',
    destinationId: 2,
    activityName: 'Scuba Diving',
    durationHours: 3,
    startTime: '09:00',
    endTime: '12:00',
    description: '',
  },
];

const ITEMS: ItineraryItem[] = [
  {
    itineraryId: 'i1',
    tripId: 't1',
    activityId: 'a2',
    activityName: 'Sunset Walk',
    activityDate: '2026-07-13',
    startTime: null,
    endTime: null,
    status: 'Pending',
    completionTime: null,
  },
];

async function render(list = () => of(ITEMS), create = vi.fn()) {
  await TestBed.configureTestingModule({
    imports: [TripItineraryTab],
    providers: [
      provideIcons({ lucideClock, lucidePlus, lucideSparkles }),
      { provide: ActivitiesService, useValue: { getActivities: () => of(ACTIVITIES) } },
      { provide: ItineraryService, useValue: { list, create } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(TripItineraryTab);
  fixture.componentRef.setInput('trip', TRIP);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

interface ItineraryDay {
  day: number;
  date: string;
  items: ItineraryItem[];
}

function days(fixture: ReturnType<typeof TestBed.createComponent<TripItineraryTab>>): ItineraryDay[] {
  return (fixture.componentInstance as unknown as { days: () => ItineraryDay[] }).days();
}

describe('TripItineraryTab', () => {
  it('groups itinerary items by day, numbered from the trip start date', async () => {
    const fixture = await render();
    const result = days(fixture);
    expect(result).toHaveLength(1);
    expect(result[0].day).toBe(2);
    expect(result[0].items[0].activityName).toBe('Sunset Walk');
  });

  it('renders every available activity in the sidebar', async () => {
    const fixture = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Scuba Diving');
  });

  it('creates an itinerary item dated to the trip start date when the sidebar + is clicked', async () => {
    const create = vi.fn().mockReturnValue(of({ ...ITEMS[0], itineraryId: 'i2', activityId: 'a1' }));
    const fixture = await render(() => of([]), create);

    // Two buttons render a lucidePlus icon: the decorative header "Add Activity"
    // button (no click handler) and the sidebar's per-activity "+" (which
    // actually calls onAddActivity). Both get "h-7" from the shared size="sm"
    // button variant, so that alone isn't unique — but only the sidebar button
    // is also a square icon button (w-7 p-0, from the "h-7 w-7 p-0" template
    // classes), so scope the query to that instead.
    const addButton = (fixture.nativeElement as HTMLElement).querySelector('button.w-7') as HTMLButtonElement;
    expect(addButton).not.toBeNull();
    addButton.click();
    await fixture.whenStable();

    expect(create).toHaveBeenCalledWith({
      tripId: 't1',
      activityId: 'a1',
      activityDate: '2026-07-12',
      status: 'Pending',
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `ng test --include='src/app/features/trips/components/trip-detail/tabs/trip-itinerary-tab/trip-itinerary-tab.spec.ts'`
Expected: FAIL — `trip` input required, `days` isn't a function, mock `itinerary`/`activities` imports no longer used.

- [ ] **Step 3: Rewrite `trip-itinerary-tab.ts`**

Replace the entire file:

```ts
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { ActivitiesService } from '@app/core/activities/activities.service';
import { Activity } from '@app/core/activities/activity.models';
import { ItineraryService } from '@app/features/trips/services/itinerary.service';
import { ItineraryItem } from '@app/features/trips/services/itinerary.models';
import { Trip } from '@app/features/trips/services/trip.models';

interface ItineraryDay {
  day: number;
  date: string;
  items: ItineraryItem[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Component({
  selector: 'app-trip-itinerary-tab',
  imports: [NgIcon, HlmCardImports, HlmButtonImports],
  templateUrl: './trip-itinerary-tab.html',
})
export class TripItineraryTab implements OnInit {
  public readonly trip = input.required<Trip>();

  private readonly activitiesService = inject(ActivitiesService);
  private readonly itineraryService = inject(ItineraryService);

  protected readonly availableActivities = signal<Activity[]>([]);
  protected readonly items = signal<ItineraryItem[]>([]);
  protected readonly addError = signal<string | null>(null);

  protected readonly days = computed<ItineraryDay[]>(() => {
    const startDate = new Date(this.trip().startDate);
    const byDate = new Map<string, ItineraryItem[]>();
    for (const item of this.items()) {
      const list = byDate.get(item.activityDate) ?? [];
      list.push(item);
      byDate.set(item.activityDate, list);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayItems]) => ({
        day: Math.floor((new Date(date).getTime() - startDate.getTime()) / MS_PER_DAY) + 1,
        date,
        items: dayItems,
      }));
  });

  ngOnInit(): void {
    const trip = this.trip();

    this.activitiesService.getActivities(trip.destinationId).subscribe({
      next: (activities) => this.availableActivities.set(activities),
      error: () => {
        // Sidebar just stays empty.
      },
    });

    this.itineraryService.list(trip.tripId).subscribe({
      next: (items) => this.items.set(items),
      error: () => {
        // Day-wise list just stays empty.
      },
    });
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  }

  protected onAddActivity(activity: Activity): void {
    const trip = this.trip();
    this.addError.set(null);
    this.itineraryService
      .create({
        tripId: trip.tripId,
        activityId: activity.activityId,
        activityDate: trip.startDate,
        status: 'Pending',
      })
      .subscribe({
        next: (item) => this.items.update((list) => [...list, item]),
        error: () => this.addError.set('Could not add this activity. Please try again.'),
      });
  }
}
```

- [ ] **Step 4: Rewrite `trip-itinerary-tab.html`**

Replace the entire file:

```html
<div class="grid lg:grid-cols-3 gap-6">
  <div hlmCard class="lg:col-span-2">
    <div hlmCardHeader class="flex flex-row items-center justify-between">
      <h3 hlmCardTitle>Day-wise Itinerary</h3>
      <button hlmBtn size="sm"><ng-icon name="lucidePlus" class="h-4 w-4 mr-1" />Add Activity</button>
    </div>
    <div hlmCardContent class="space-y-6">
      @if (days().length === 0) {
        <p class="text-sm text-muted-foreground">No itinerary items yet. Add one from the sidebar.</p>
      }
      @for (day of days(); track day.day) {
        <div class="flex gap-4">
          <div class="text-center w-16 shrink-0">
            <div class="rounded-md bg-primary text-primary-foreground p-2">
              <p class="text-xs uppercase">Day</p>
              <p class="text-xl font-bold">{{ day.day }}</p>
            </div>
            <p class="text-xs text-muted-foreground mt-1">{{ formatDate(day.date) }}</p>
          </div>
          <div class="flex-1 space-y-2">
            <p class="font-medium">Day {{ day.day }}</p>
            @for (it of day.items; track it.itineraryId) {
              <div class="flex items-start gap-3 p-3 rounded-md border bg-card">
                <ng-icon name="lucideClock" class="h-4 w-4 text-muted-foreground mt-0.5" />
                <div class="flex-1">
                  <p class="text-sm font-medium">{{ it.activityName }}</p>
                </div>
                <span class="text-xs text-muted-foreground tabular-nums">{{ it.status }}</span>
              </div>
            }
          </div>
        </div>
      }
    </div>
  </div>
  <div hlmCard>
    <div hlmCardHeader>
      <h3 hlmCardTitle class="flex items-center gap-2">
        <ng-icon name="lucideSparkles" class="h-4 w-4 text-accent" />Available Activities
      </h3>
      <p class="text-xs text-muted-foreground">Click + to slot into a day.</p>
    </div>
    <div hlmCardContent class="space-y-2">
      @if (availableActivities().length === 0) {
        <p class="text-sm text-muted-foreground">No activities available for this destination yet.</p>
      }
      @for (a of availableActivities(); track a.activityId) {
        <div class="flex items-center gap-3 p-2.5 rounded-md border bg-card">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ a.activityName }}</p>
            <p class="text-xs text-muted-foreground">{{ a.durationHours }} hr</p>
          </div>
          <button hlmBtn size="sm" variant="ghost" class="h-7 w-7 p-0" (click)="onAddActivity(a)">
            <ng-icon name="lucidePlus" class="h-4 w-4" />
          </button>
        </div>
      }
      @if (addError()) {
        <p class="text-xs text-destructive">{{ addError() }}</p>
      }
    </div>
  </div>
</div>
```

- [ ] **Step 5: Run to verify it passes**

Run: `ng test --include='src/app/features/trips/components/trip-detail/tabs/trip-itinerary-tab/trip-itinerary-tab.spec.ts'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/trips/components/trip-detail/tabs/trip-itinerary-tab/
git commit -m "feat(trip-itinerary-tab): wire day-wise itinerary and activity catalog to real data"
```

---

### Task 10: Full-suite verification

**Files:** none (verification only).

**Interfaces:** none — this task only runs commands and reports results.

- [ ] **Step 1: Run the full test suite**

From `frontend/`: `ng test`
Expected: PASS, no failing suites, including `trip-detail.spec.ts` (now that Tasks 7–9 satisfy the inputs `trip-detail.html` binds).

- [ ] **Step 2: Run the production build**

From `frontend/`: `ng build`
Expected: builds with no TypeScript errors (confirms no leftover references to `@app/core/mock-data`'s `trips`/`buses`/`activities`/`itinerary` in the touched files).

- [ ] **Step 3: Confirm no remaining mock-data imports in the touched files**

Run: `grep -rn "core/mock-data" frontend/src/app/features/trips/components/trip-detail/`
Expected: no matches (every file this plan touched has moved off `core/mock-data`; `trip-members-tab`, `trip-accommodation-tab`, `trip-expenses-tab`, `trip-alerts-tab`, `trip-reviews-tab` are out of scope for this plan and may still legitimately reference it).

- [ ] **Step 4: Manual verification against the running backend**

With the backend running (`./mvnw spring-boot:run` from `backend/`) and the frontend dev server running (`ng serve` from `frontend/`):
1. Log in, open a real trip's detail page.
2. Overview tab: confirm the stat cards, budget meter, and timeline reflect real member/budget-summary/bus-booking/itinerary-progress state (cross-check against `GET /api/trips/{tripId}/budget/summary` and `GET /api/itinerary/progress?tripId={tripId}` via curl with the same bearer token).
3. Travel tab: confirm bus search results appear immediately on load (auto-searched from the trip's own source/destination/date), and that changing the search fields and clicking Search re-queries `GET /api/schedules/search`.
4. Itinerary tab: click a sidebar `+`, confirm a `POST /api/itinerary` fires (browser devtools Network tab) and the new item appears under the day matching the trip's start date.

- [ ] **Step 5: Commit** (only if Step 3's grep or manual verification surfaced a fix)

```bash
git add -A
git commit -m "chore: verification fixes for trip-detail API integration"
```

If no fixes were needed, skip this step — there is nothing to commit.
