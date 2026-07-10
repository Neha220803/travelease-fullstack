# Traveler Bus Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the real ROLE_TRAVELER Bus Booking Angular frontend (search, seat lock, fare/coupon preview, passenger details, simulated payment, confirmation, ticket/QR, verification, My Bookings, cancellation/refund, and Traveler Trip attachment/detachment) as a standalone `features/bus-booking/` feature that the existing Trip-context entry point (`trip-travel-tab`) reuses, wired to the existing Spring Boot Bus Booking backend exactly as-is.

**Architecture:** One standalone Angular feature (`features/bus-booking/`) with a flat `services/` folder (models + services, matching the `features/trips/services/` convention) and a `components/` folder of small, single-purpose pieces. A single stateful `BookingFlow` component (internal step signal, no stepper library exists in this app) implements Search → Seats → Passengers → Review, accepting an optional `tripId` input so the existing Trip-context entry point embeds it directly instead of duplicating it. Confirmation/Ticket are always routed, post-success-only pages. Ticket Verification is a public route outside the traveler auth guard.

**Tech Stack:** Angular (standalone components, signals, functional guards/interceptors), Spartan UI (`@spartan-ng/helm/*`), Tailwind CSS, RxJS, Vitest via `ng test --include <path> --watch=false` (the Angular `@angular/build:unit-test` builder type-checks the whole `tsconfig.spec.json` program regardless of `--include`, so any pre-existing broken file blocks all runs — verify the suite is green before starting).

## Global Constraints

- Approved design spec: `travelease-fullstack/docs/superpowers/specs/2026-07-09-traveler-bus-booking-design.md`. Implement it exactly; do not reopen/redesign Sections B–H unless source inspection proves a direct contradiction with current backend source — if that happens, stop and flag it rather than silently deviating.
- **No backend production code is modified anywhere in this plan.** Every task is frontend-only, integrating with existing, unmodified backend endpoints.
- **Git safety (standing rule, all tasks):** never run `git add`, `git commit`, `git push`, `git reset`, `git restore`, or `git revert`. Every task's final step is a **read-only** `git status`/`git diff` inspection, not a commit — this replaces the writing-plans skill's default "Step N: Commit" step throughout this entire plan.
- Visual language: Spartan UI + Tailwind CSS, matching the existing Traveler convention exactly (`hlmCard`, plain inline-text loading/error/empty states, `<app-page-header>` with an action-slot button) — never the Transport Provider dashboard's skeleton-heavy convention.
- `SeatType` is exactly `'WINDOW' | 'AISLE' | 'LADIES' | 'RESERVED' | 'DRIVER'`; `SeatStatus` is exactly `'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'MAINTENANCE'` — no `LOCKED` value anywhere in these unions.
- Gender values submitted to the backend are exactly the strings `'FEMALE' | 'MALE' | 'OTHER'`.
- Test runner command for every task: `npx ng test --include <spec-path-glob> --watch=false` run from `travelease-fullstack/frontend/`.
- Build validation command: `npx ng build` run from `travelease-fullstack/frontend/`.

---

## File Structure

**New — `frontend/src/app/features/bus-booking/`:**
- `services/schedule.models.ts` — search/seat/fare/coupon models (moved + corrected from `features/trips/services/`)
- `services/schedule.service.ts` — search, seats, seat lock/unlock, fare calculation (moved + extended)
- `services/booking.models.ts` — booking/passenger/ticket/cancellation/refund/trip-attachment models (new)
- `services/booking.service.ts` — booking CRUD, cancellation, refund, ticket, trip attachment (new; also absorbs `attachBookingToTrip`/`getTripBusBookings` from the old `schedule.service.ts`, plus new `removeBookingFromTrip`)
- `components/bus-search-form/` — extracted search form (source/destination/date/search button)
- `components/seat-grid/` — extracted + corrected seat grid with lock/409-conflict handling
- `components/fare-summary/` — reusable fare/coupon breakdown display
- `components/passenger-details-form/` — new passenger form (name/age/gender/contact/primary selector, LADIES-seat gender lock)
- `components/booking-flow/` — new stateful stepper (Search → Seats → Passengers → Review & Payment)
- `components/booking-confirmation/` — new post-success page (reads `tripId` query param)
- `components/ticket-card/` — new shared presentational ticket/QR display
- `components/ticket-display/` — new authenticated wrapper around `ticket-card`
- `components/ticket-verification/` — new public lookup wrapper around `ticket-card`
- `components/my-bookings/` — new paginated booking history list
- `components/booking-detail/` — new detail/timeline/modify page
- `components/cancel-booking-dialog/` — new full-cancellation dialog (estimate-labeled preview)
- `components/partial-cancel-dialog/` — new partial-cancellation dialog (blocks "cancel all" combination)
- `bus-booking.routes.ts` — feature route table

**Modified:**
- `features/traveler/traveler.routes.ts` — add `bus-booking` child route
- `app.routes.ts` — add public `verify-ticket` route
- `shared/layout/app-shell/app-shell.ts` / `.html` — add nav entry + "New Booking" CTA
- `features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab.ts` / `.html` / `.spec.ts` — refactored down to trip-specific wiring, embeds `BookingFlow` + shows the Trip Bus Bookings summary with owner-only detach
- `package.json` — add a QR-rendering dependency

**Deleted (superseded, after all references are updated):**
- `features/trips/services/schedule.models.ts`
- `features/trips/services/schedule.service.ts`

---

### Task 1: Add QR-rendering dependency

**Files:**
- Modify: `frontend/package.json`

**Interfaces:**
- Produces: an installed `angularx-qrcode` package usable by later tasks as `<qrcode>` (its component selector) or equivalent API — confirmed at install time by reading its README/type defs.

- [ ] **Step 1: Install the package**

Run from `travelease-fullstack/frontend/`:
```bash
npm install angularx-qrcode
```
Expected: `package.json` gains `"angularx-qrcode": "^..."` under `dependencies`, `package-lock.json` updates.

- [ ] **Step 2: Verify the package exposes a standalone Angular component**

Run:
```bash
node -e "console.log(require('angularx-qrcode/package.json').version)"
```
Expected: prints a version string with no error. Then read `node_modules/angularx-qrcode/README.md` (or its `.d.ts` exports) to confirm the exact import path and selector (expected: `import { QRCodeComponent } from 'angularx-qrcode'`, selector `<qrcode>`, input `qrdata`). If the exact API differs from this expectation, use the real one in Task 12 — do not guess.

- [ ] **Step 3: Run the existing full test suite to confirm nothing broke**

Run from `travelease-fullstack/frontend/`:
```bash
npx ng test --watch=false
```
Expected: same pass count as before this change (adding a dependency must not change any existing test's outcome).

- [ ] **Step 4: Inspect changes (read-only)**

Run:
```bash
git status
git diff --stat
```
Expected: only `package.json`/`package-lock.json` modified. Do not stage or commit.

---

### Task 2: Create `booking.models.ts`

**Files:**
- Create: `frontend/src/app/features/bus-booking/services/booking.models.ts`
- Test: none (pure type/interface file — verified via the TypeScript compiler during `ng build`/`ng test` in later tasks, per this codebase's convention of not unit-testing plain model files)

**Interfaces:**
- Produces: `BookingStatus`, `PaymentStatus`, `RefundStatus`, `CancellationReason` type unions; `PassengerDetailDto`, `BookingRequest`, `BookingSeatResponse`, `BookingTimelineResponse`, `BookingResponse`, `TicketResponse`, `BookingHistoryResponse`, `PaginatedSearchResponse<T>`, `CancellationRequest`, `PartialCancellationRequest`, `CancellationResponse`, `RefundResponse`, `BookingModificationRequest`, `TripBusBooking`, `TripBusBookingSummary`, `AttachBusBookingRequest` — all consumed by `booking.service.ts` (Task 5) and every UI component from Task 8 onward.

- [ ] **Step 1: Write the file**

```ts
export type BookingStatus = 'PENDING' | 'RESERVED' | 'CONFIRMED' | 'FAILED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export type RefundStatus = 'INITIATED' | 'PROCESSING' | 'APPROVED' | 'COMPLETED' | 'FAILED' | 'REJECTED';

export type CancellationReason = 'PERSONAL_EMERGENCY' | 'MEDICAL' | 'CHANGE_OF_PLANS' | 'WEATHER' | 'OTHER';

export interface PassengerDetailDto {
  seatId: number;
  passengerName: string;
  passengerAge: number;
  passengerGender: 'FEMALE' | 'MALE' | 'OTHER';
  passengerEmail?: string;
  passengerPhone?: string;
  isPrimary?: boolean;
}

export interface BookingRequest {
  scheduleId: number;
  seatIds: number[];
  passengerDetails: PassengerDetailDto[];
  couponCode?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface BookingSeatResponse {
  seatId: number;
  seatNumber: string;
  passengerName: string;
  passengerAge: number;
  passengerGender: string;
  isPrimary: boolean;
  isCancelled?: boolean;
}

export interface BookingTimelineResponse {
  event: string;
  description: string;
  occurredAt: string;
}

export interface ScheduleSummary {
  id: number;
  busName: string;
  busNumber: string;
  source: string;
  destination: string;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
}

export interface BookingResponse {
  id: number;
  bookingReference: string;
  status: BookingStatus;
  totalFare: number;
  ticketNumber: string | null;
  qrCodeString: string | null;
  paymentStatus: PaymentStatus;
  contactEmail: string | null;
  contactPhone: string | null;
  couponCode: string | null;
  couponDiscount: number | null;
  bookedAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  scheduleId: number;
  routeId: number;
  providerId: number;
  busId: number;
  userId: string;
  schedule: ScheduleSummary | null;
  seats: BookingSeatResponse[];
  timeline: BookingTimelineResponse[];
}

export interface TicketResponse {
  bookingId: number;
  bookingReference: string;
  ticketNumber: string;
  qrCodeString: string;
  status: BookingStatus;
  scheduleId: number;
  routeId: number;
  providerId: number;
  busId: number;
  busName: string;
  busNumber: string;
  source: string;
  destination: string;
  travelDate: string;
  primaryPassengerName: string;
  totalPassengers: number;
  totalFare: number;
  bookedAt: string;
  confirmedAt: string | null;
}

export interface BookingHistoryResponse {
  id: number;
  bookingReference: string;
  source: string;
  destination: string;
  travelDate: string;
  departureTime: string;
  totalFare: number;
  status: BookingStatus;
  busName: string;
  seatsBooked: number;
  bookedAt: string;
  ticketNumber: string | null;
  paymentStatus: string;
}

export interface PaginatedSearchResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface BookingModificationRequest {
  bookingId: number;
  updatedPassengerDetails?: PassengerDetailDto[];
  contactEmail?: string;
  contactPhone?: string;
}

export interface CancellationRequest {
  bookingId: number;
  reason: CancellationReason;
  reasonText?: string;
}

export interface PartialCancellationRequest {
  bookingId: number;
  seatIds: number[];
  reason: CancellationReason;
  reasonText?: string;
}

export interface RefundResponse {
  id: number;
  refundReference: string;
  bookingId: number;
  bookingReference: string;
  originalAmount: number;
  cancellationCharge: number;
  gstAdjustment: number | null;
  couponAdjustment: number | null;
  netRefundable: number;
  status: RefundStatus;
  reason: string;
  rejectionReason: string | null;
  initiatedAt: string | null;
  processedAt: string | null;
  approvedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  rejectedAt: string | null;
}

export interface CancellationResponse {
  bookingId: number;
  bookingReference: string;
  status: BookingStatus;
  reason: string;
  reasonText: string | null;
  partialCancellation: boolean;
  cancelledSeatIds: number[];
  totalCancelledSeats: number;
  originalFare: number;
  cancellationCharge: number;
  refundAmount: number;
  netPayableAfterCancellation: number;
  refund: RefundResponse | null;
  ticketStatus: string;
}

export interface TripBusBooking {
  bookingId: number;
  bookingReference: string;
  status: BookingStatus;
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

export interface AttachBusBookingRequest {
  bookingId: number;
}
```

- [ ] **Step 2: Verify the project still type-checks**

Run from `travelease-fullstack/frontend/`:
```bash
npx tsc --noEmit -p tsconfig.json
```
Expected: no new errors (this file is not yet imported anywhere, so it can only fail on its own syntax).

- [ ] **Step 3: Inspect changes (read-only)**

```bash
git status
git diff --stat
```
Expected: one new untracked file. Do not stage or commit.

---

### Task 3: Create corrected `schedule.models.ts` in the new feature

**Files:**
- Create: `frontend/src/app/features/bus-booking/services/schedule.models.ts`
- Test: none (pure model file, same rationale as Task 2)

**Interfaces:**
- Consumes: nothing
- Produces: `BusSearchResult`, `SeatType`, `SeatStatus`, `SeatResponse`, `SeatLayoutResponse`, `SeatLockRequest`, `SeatLockResponse`, `SeatOccupancyResponse`, `FareCalculationRequest`, `SeatFareBreakdown`, `FareBreakdownResponse`, `PriceCalculatorResponse`, `CancellationPreviewResponse` — consumed by `schedule.service.ts` (Task 4) and UI components from Task 8 onward.

- [ ] **Step 1: Write the file**

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

export type SeatType = 'WINDOW' | 'AISLE' | 'LADIES' | 'RESERVED' | 'DRIVER';

export type SeatStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'MAINTENANCE';

export interface SeatResponse {
  id: number;
  seatNumber: string;
  seatType: SeatType;
  deck: number;
  status: SeatStatus;
}

export interface SeatLayoutResponse {
  busId: number;
  busName: string;
  seats: SeatResponse[];
}

export interface SeatLockRequest {
  scheduleId: number;
  seatIds: number[];
}

export interface SeatLockResponse {
  scheduleId: number;
  lockedSeatIds: number[];
  lockedAt: string;
  expiresAt: string;
  message: string;
}

export interface SeatOccupancyResponse {
  scheduleId: number;
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  lockedSeats: number;
  occupancyPercentage: number;
}

export interface FareCalculationRequest {
  scheduleId: number;
  seatIds: number[];
  couponCode?: string;
}

export interface SeatFareBreakdown {
  seatId: number;
  seatNumber: string;
  seatType: SeatType;
  baseFare: number;
  seatTypeSurcharge: number;
  dynamicAdjustment: number;
  subtotal: number;
  discount: number;
  finalFare: number;
}

export interface FareBreakdownResponse {
  scheduleId: number;
  routeId: number;
  busId: number;
  busNumber: string;
  busType: string;
  source: string;
  destination: string;
  travelDate: string;
  numberOfSeats: number;
  occupancyPercentage: number;
  baseFare: number;
  dynamicFareAdjustment: number;
  weekendSurcharge: number;
  festivalSurcharge: number;
  seasonalSurcharge: number;
  seatTypeSurcharge: number;
  busTypeSurcharge: number;
  subtotal: number;
  discountAmount: number;
  appliedDiscount: string | null;
  couponDiscount: number;
  appliedCoupon: string | null;
  gstAmount: number;
  gstPercent: number;
  taxAmount: number;
  taxPercent: number;
  finalAmount: number;
  cancellationChargePercent: number;
  refundPercent: number;
  cancellationCharge: number;
  refundAmount: number;
  seatBreakdowns: SeatFareBreakdown[];
}

export interface PriceCalculatorResponse {
  breakdown: FareBreakdownResponse;
  totalPayable: number;
  totalSavings: number;
}

export interface CancellationPreviewResponse {
  scheduleId: number;
  originalFare: number;
  cancellationChargePercent: number;
  cancellationCharge: number;
  refundPercent: number;
  refundableAmount: number;
}
```

- [ ] **Step 2: Verify type-check**

```bash
npx tsc --noEmit -p tsconfig.json
```
Expected: no new errors.

- [ ] **Step 3: Inspect changes (read-only)**

```bash
git status
```
Expected: one new untracked file.

---

### Task 4: Create `schedule.service.ts` in the new feature (search, seats, lock/unlock, fare)

**Files:**
- Create: `frontend/src/app/features/bus-booking/services/schedule.service.ts`
- Test: `frontend/src/app/features/bus-booking/services/schedule.service.spec.ts`

**Interfaces:**
- Consumes: `BusSearchResult`, `SeatLayoutResponse`, `SeatLockRequest`, `SeatLockResponse`, `FareCalculationRequest`, `PriceCalculatorResponse`, `CancellationPreviewResponse` from Task 3; `API_BASE_URL` from `@app/core/api/api-config`; `ApiResponse` from `@app/core/api/api-response.model`.
- Produces: `ScheduleService` class with `searchBuses(source, destination, date)`, `getSeats(scheduleId)`, `lockSeats(request: SeatLockRequest)`, `unlockSeats(scheduleId, seatIds)`, `calculateFare(request: FareCalculationRequest)`, `getCancellationPreview(scheduleId, totalFare)` — consumed by `seat-grid` (Task 9), `fare-summary` (Task 10), `booking-flow` (Task 12), `cancel-booking-dialog` (Task 17).

- [ ] **Step 1: Write the failing test**

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ScheduleService } from '@app/features/bus-booking/services/schedule.service';
import { API_BASE_URL } from '@app/core/api/api-config';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ScheduleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('locks seats via POST /api/seats/lock', () => {
    service.lockSeats({ scheduleId: 5, seatIds: [1, 2] }).subscribe((res) => {
      expect(res.lockedSeatIds).toEqual([1, 2]);
    });
    const req = httpMock.expectOne(`${API_BASE_URL}/api/seats/lock`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ scheduleId: 5, seatIds: [1, 2] });
    req.flush({
      data: { scheduleId: 5, lockedSeatIds: [1, 2], lockedAt: '2026-07-09T10:00:00', expiresAt: '2026-07-09T10:05:00', message: 'ok' },
    });
  });

  it('surfaces a 409 SEAT_UNAVAILABLE conflict without transforming it', () => {
    let caught: unknown;
    service.lockSeats({ scheduleId: 5, seatIds: [3] }).subscribe({
      error: (err) => (caught = err),
    });
    const req = httpMock.expectOne(`${API_BASE_URL}/api/seats/lock`);
    req.flush(
      { success: false, error: { code: 'SEAT_UNAVAILABLE', message: 'Seat with ID 3 is currently locked by another user' } },
      { status: 409, statusText: 'Conflict' },
    );
    expect((caught as { status: number }).status).toBe(409);
  });

  it('calculates fare via POST /api/fares/calculate', () => {
    service.calculateFare({ scheduleId: 5, seatIds: [1] }).subscribe((res) => {
      expect(res.totalPayable).toBe(500);
    });
    const req = httpMock.expectOne(`${API_BASE_URL}/api/fares/calculate`);
    expect(req.request.method).toBe('POST');
    req.flush({ data: { breakdown: {}, totalPayable: 500, totalSavings: 0 } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `travelease-fullstack/frontend/`:
```bash
npx ng test --include src/app/features/bus-booking/services/schedule.service.spec.ts --watch=false
```
Expected: FAIL — `schedule.service.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  BusSearchResult,
  SeatLayoutResponse,
  SeatLockRequest,
  SeatLockResponse,
  FareCalculationRequest,
  PriceCalculatorResponse,
  CancellationPreviewResponse,
} from '@app/features/bus-booking/services/schedule.models';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly http = inject(HttpClient);

  searchBuses(source: string, destination: string, date: string): Observable<BusSearchResult[]> {
    const params = new HttpParams().set('source', source).set('destination', destination).set('date', date);
    return this.http
      .get<ApiResponse<BusSearchResult[]>>(`${API_BASE_URL}/api/schedules/search`, { params })
      .pipe(map((response) => response.data));
  }

  getSeats(scheduleId: number): Observable<SeatLayoutResponse> {
    const params = new HttpParams().set('scheduleId', scheduleId.toString());
    return this.http
      .get<ApiResponse<SeatLayoutResponse>>(`${API_BASE_URL}/api/seats`, { params })
      .pipe(map((response) => response.data));
  }

  lockSeats(request: SeatLockRequest): Observable<SeatLockResponse> {
    return this.http
      .post<ApiResponse<SeatLockResponse>>(`${API_BASE_URL}/api/seats/lock`, request)
      .pipe(map((response) => response.data));
  }

  unlockSeats(scheduleId: number, seatIds: number[]): Observable<void> {
    let params = new HttpParams().set('scheduleId', scheduleId.toString());
    for (const id of seatIds) {
      params = params.append('seatIds', id.toString());
    }
    return this.http
      .delete<ApiResponse<void>>(`${API_BASE_URL}/api/seats/lock`, { params })
      .pipe(map((response) => response.data));
  }

  calculateFare(request: FareCalculationRequest): Observable<PriceCalculatorResponse> {
    return this.http
      .post<ApiResponse<PriceCalculatorResponse>>(`${API_BASE_URL}/api/fares/calculate`, request)
      .pipe(map((response) => response.data));
  }

  getCancellationPreview(scheduleId: number, totalFare: number): Observable<CancellationPreviewResponse> {
    const params = new HttpParams().set('totalFare', totalFare.toString());
    return this.http
      .get<ApiResponse<CancellationPreviewResponse>>(`${API_BASE_URL}/api/fares/cancellation-preview/${scheduleId}`, { params })
      .pipe(map((response) => response.data));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --include src/app/features/bus-booking/services/schedule.service.spec.ts --watch=false
```
Expected: PASS, 3 specs.

- [ ] **Step 5: Inspect changes (read-only)**

```bash
git status
git diff --stat
```
Expected: two new untracked files. Do not stage or commit.

---

### Task 5: Create `booking.service.ts` in the new feature

**Files:**
- Create: `frontend/src/app/features/bus-booking/services/booking.service.ts`
- Test: `frontend/src/app/features/bus-booking/services/booking.service.spec.ts`

**Interfaces:**
- Consumes: every type from `booking.models.ts` (Task 2); `API_BASE_URL`, `ApiResponse`.
- Produces: `BookingService` class with `createBooking(request)`, `getBookings(params)`, `getBookingById(id)`, `getBookingTimeline(id)`, `modifyBooking(request)`, `cancelBooking(id, request?)`, `partialCancelBooking(request)`, `getTicket(id)`, `verifyTicket(ticketNumber)`, `getRefundsByBooking(bookingId)`, `attachBookingToTrip(tripId, bookingId)`, `removeBookingFromTrip(tripId, bookingId)`, `getTripBusBookings(tripId)` — consumed by every component from Task 12 onward and by the refactored `trip-travel-tab` (Task 19).

- [ ] **Step 1: Write the failing test**

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { API_BASE_URL } from '@app/core/api/api-config';

describe('BookingService', () => {
  let service: BookingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(BookingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates a booking via POST /api/bookings', () => {
    service.createBooking({ scheduleId: 1, seatIds: [1], passengerDetails: [] }).subscribe((res) => {
      expect(res.id).toBe(42);
    });
    const req = httpMock.expectOne(`${API_BASE_URL}/api/bookings`);
    expect(req.request.method).toBe('POST');
    req.flush({ data: { id: 42, status: 'CONFIRMED' } });
  });

  it('lists bookings with scope/status/reference/date filters', () => {
    service.getBookings({ scope: 'UPCOMING', status: 'CONFIRMED' }).subscribe((res) => {
      expect(res.content).toEqual([]);
    });
    const req = httpMock.expectOne(
      (r) => r.url === `${API_BASE_URL}/api/bookings` && r.params.get('scope') === 'UPCOMING' && r.params.get('status') === 'CONFIRMED',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ data: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true } });
  });

  it('cancels a booking via POST /api/bookings/{id}/cancel with an optional reason body', () => {
    service.cancelBooking(42, { bookingId: 42, reason: 'CHANGE_OF_PLANS' }).subscribe((res) => {
      expect(res.status).toBe('CANCELLED');
    });
    const req = httpMock.expectOne(`${API_BASE_URL}/api/bookings/42/cancel`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ bookingId: 42, reason: 'CHANGE_OF_PLANS' });
    req.flush({ data: { bookingId: 42, status: 'CANCELLED' } });
  });

  it('detaches a booking from a trip via DELETE /api/trips/{tripId}/bus-bookings/{bookingId}', () => {
    service.removeBookingFromTrip('trip-1', 42).subscribe();
    const req = httpMock.expectOne(`${API_BASE_URL}/api/trips/trip-1/bus-bookings/42`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ data: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --include src/app/features/bus-booking/services/booking.service.spec.ts --watch=false
```
Expected: FAIL — `booking.service.ts` does not exist.

- [ ] **Step 3: Write the implementation**

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  BookingRequest,
  BookingResponse,
  BookingHistoryResponse,
  BookingTimelineResponse,
  BookingModificationRequest,
  CancellationRequest,
  PartialCancellationRequest,
  CancellationResponse,
  RefundResponse,
  TicketResponse,
  PaginatedSearchResponse,
  TripBusBookingSummary,
} from '@app/features/bus-booking/services/booking.models';

export interface GetBookingsParams {
  scope?: 'UPCOMING' | 'PAST';
  status?: string;
  reference?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly http = inject(HttpClient);

  createBooking(request: BookingRequest): Observable<BookingResponse> {
    return this.http
      .post<ApiResponse<BookingResponse>>(`${API_BASE_URL}/api/bookings`, request)
      .pipe(map((response) => response.data));
  }

  getBookings(filters: GetBookingsParams): Observable<PaginatedSearchResponse<BookingHistoryResponse>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http
      .get<ApiResponse<PaginatedSearchResponse<BookingHistoryResponse>>>(`${API_BASE_URL}/api/bookings`, { params })
      .pipe(map((response) => response.data));
  }

  getBookingById(id: number): Observable<BookingResponse> {
    return this.http
      .get<ApiResponse<BookingResponse>>(`${API_BASE_URL}/api/bookings/${id}`)
      .pipe(map((response) => response.data));
  }

  getBookingTimeline(id: number): Observable<BookingTimelineResponse[]> {
    return this.http
      .get<ApiResponse<BookingTimelineResponse[]>>(`${API_BASE_URL}/api/bookings/${id}/timeline`)
      .pipe(map((response) => response.data));
  }

  modifyBooking(request: BookingModificationRequest): Observable<BookingResponse> {
    return this.http
      .put<ApiResponse<BookingResponse>>(`${API_BASE_URL}/api/bookings/modify`, request)
      .pipe(map((response) => response.data));
  }

  cancelBooking(id: number, request?: CancellationRequest): Observable<CancellationResponse> {
    return this.http
      .post<ApiResponse<CancellationResponse>>(`${API_BASE_URL}/api/bookings/${id}/cancel`, request ?? null)
      .pipe(map((response) => response.data));
  }

  partialCancelBooking(request: PartialCancellationRequest): Observable<CancellationResponse> {
    return this.http
      .post<ApiResponse<CancellationResponse>>(`${API_BASE_URL}/api/bookings/cancel/partial`, request)
      .pipe(map((response) => response.data));
  }

  getTicket(id: number): Observable<TicketResponse> {
    return this.http
      .get<ApiResponse<TicketResponse>>(`${API_BASE_URL}/api/bookings/${id}/ticket`)
      .pipe(map((response) => response.data));
  }

  verifyTicket(ticketNumber: string): Observable<TicketResponse> {
    return this.http
      .get<ApiResponse<TicketResponse>>(`${API_BASE_URL}/api/bookings/ticket/verify/${ticketNumber}`)
      .pipe(map((response) => response.data));
  }

  getRefundsByBooking(bookingId: number): Observable<RefundResponse[]> {
    const params = new HttpParams().set('bookingId', bookingId.toString());
    return this.http
      .get<ApiResponse<RefundResponse[]>>(`${API_BASE_URL}/api/refunds`, { params })
      .pipe(map((response) => response.data));
  }

  attachBookingToTrip(tripId: string, bookingId: number): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${API_BASE_URL}/api/trips/${tripId}/bus-bookings`, { bookingId })
      .pipe(map((response) => response.data));
  }

  removeBookingFromTrip(tripId: string, bookingId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${API_BASE_URL}/api/trips/${tripId}/bus-bookings/${bookingId}`)
      .pipe(map((response) => response.data));
  }

  getTripBusBookings(tripId: string): Observable<TripBusBookingSummary> {
    return this.http
      .get<ApiResponse<TripBusBookingSummary>>(`${API_BASE_URL}/api/trips/${tripId}/bus-bookings`)
      .pipe(map((response) => response.data));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --include src/app/features/bus-booking/services/booking.service.spec.ts --watch=false
```
Expected: PASS, 4 specs.

- [ ] **Step 5: Inspect changes (read-only)**

```bash
git status
git diff --stat
```
Expected: two new untracked files.

---

### Task 6: Retire the old `features/trips/services/schedule.*` files and repoint `trip-travel-tab`'s imports

**Files:**
- Modify: `frontend/src/app/features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab.ts` (import paths only, no behavior change yet — behavior refactor is Task 19)
- Modify: `frontend/src/app/features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab.spec.ts` (import paths only)
- Delete: `frontend/src/app/features/trips/services/schedule.models.ts`
- Delete: `frontend/src/app/features/trips/services/schedule.service.ts`

**Interfaces:**
- Consumes: `ScheduleService`/models from Task 4, `BookingService`/models from Task 5 (specifically `attachBookingToTrip`, `getTripBusBookings`, `createBooking` now live on `BookingService`, not `ScheduleService`).
- Produces: no new public interface — this task only repoints existing imports so the old duplicate files can be safely deleted before any new UI is built on top of them.

- [ ] **Step 1: Confirm no other file references the old paths**

Run from `travelease-fullstack/frontend/`:
```bash
grep -rl "features/trips/services/schedule" src/app --include=*.ts
```
Expected output: only `trip-travel-tab.ts` and `trip-travel-tab.spec.ts` (if anything else appears, stop and re-scope this task — do not delete the old files until every reference is accounted for).

- [ ] **Step 2: Update imports in `trip-travel-tab.ts`**

Change the top of the file from:
```ts
import { ScheduleService } from '@app/features/trips/services/schedule.service';
...
import {
  BusSearchResult,
  TripBusBooking,
  SeatLayoutResponse,
  SeatResponse,
  PassengerDetailDto,
} from '@app/features/trips/services/schedule.models';
```
to:
```ts
import { ScheduleService } from '@app/features/bus-booking/services/schedule.service';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import {
  BusSearchResult,
  SeatLayoutResponse,
  SeatResponse,
} from '@app/features/bus-booking/services/schedule.models';
import { TripBusBooking, PassengerDetailDto } from '@app/features/bus-booking/services/booking.models';
```
Inject `BookingService` alongside the existing `ScheduleService` injection (`private readonly bookingService = inject(BookingService);`), and change the two call sites that used to live on `ScheduleService` to use it instead:
- `this.scheduleService.getTripBusBookings(...)` → `this.bookingService.getTripBusBookings(...)`
- `this.scheduleService.createBooking(...)` → `this.bookingService.createBooking(...)`
- `this.scheduleService.attachBookingToTrip(...)` → `this.bookingService.attachBookingToTrip(...)`

Leave every other line (search/seat logic, hardcoded passenger construction, member-count seat cap) exactly as-is — that full behavioral refactor is Task 19, not this task.

- [ ] **Step 3: Update imports in `trip-travel-tab.spec.ts`**

Change:
```ts
import { ScheduleService } from '@app/features/trips/services/schedule.service';
import { BusSearchResult } from '@app/features/trips/services/schedule.models';
```
to:
```ts
import { ScheduleService } from '@app/features/bus-booking/services/schedule.service';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { BusSearchResult } from '@app/features/bus-booking/services/schedule.models';
```
Add a `BookingService` mock provider alongside the existing `ScheduleService` mock in the `render()` helper's `TestBed.configureTestingModule` providers array:
```ts
{
  provide: BookingService,
  useValue: {
    getTripBusBookings: () => of({ tripId: 't1', bookingCount: 0, totalFare: 0, bookings: [] }),
    createBooking: vi.fn(),
    attachBookingToTrip: vi.fn(),
  },
},
```
Remove `getTripBusBookings` from the existing `ScheduleService` mock object (it no longer lives there).

- [ ] **Step 4: Run the tab's tests to confirm the repoint is behavior-neutral**

```bash
npx ng test --include src/app/features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab.spec.ts --watch=false
```
Expected: PASS, same test count as before this task.

- [ ] **Step 5: Delete the superseded files**

```bash
rm frontend/src/app/features/trips/services/schedule.models.ts
rm frontend/src/app/features/trips/services/schedule.service.ts
```

- [ ] **Step 6: Run the full suite to confirm nothing else depended on the deleted files**

```bash
npx ng test --watch=false
```
Expected: same total pass count as the last known-green baseline, no new failures.

- [ ] **Step 7: Inspect changes (read-only)**

```bash
git status
git diff --stat
```
Expected: two deletions, two modifications. Do not stage or commit.

---

### Task 7: `bus-search-form` component (extracted)

**Files:**
- Create: `frontend/src/app/features/bus-booking/components/bus-search-form/bus-search-form.ts`
- Create: `frontend/src/app/features/bus-booking/components/bus-search-form/bus-search-form.html`
- Test: `frontend/src/app/features/bus-booking/components/bus-search-form/bus-search-form.spec.ts`

**Interfaces:**
- Consumes: nothing beyond Angular/Spartan primitives.
- Produces: `BusSearchForm` standalone component with inputs `initialSource: InputSignal<string>`, `initialDestination: InputSignal<string>`, `initialDate: InputSignal<Date | undefined>`, and output `search = output<{ source: string; destination: string; date: string }>()` — consumed by `booking-flow` (Task 12).

- [ ] **Step 1: Write the failing test**

```ts
import { TestBed } from '@angular/core/testing';
import { BusSearchForm } from '@app/features/bus-booking/components/bus-search-form/bus-search-form';

describe('BusSearchForm', () => {
  it('emits search with the current source/destination/date on Search click', async () => {
    await TestBed.configureTestingModule({ imports: [BusSearchForm] }).compileComponents();
    const fixture = TestBed.createComponent(BusSearchForm);
    fixture.componentRef.setInput('initialSource', 'Bengaluru');
    fixture.componentRef.setInput('initialDestination', 'Goa');
    fixture.componentRef.setInput('initialDate', new Date(2026, 6, 12));
    fixture.detectChanges();

    let emitted: { source: string; destination: string; date: string } | undefined;
    fixture.componentInstance.search.subscribe((e) => (emitted = e));

    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Search',
    )!;
    button.click();

    expect(emitted).toEqual({ source: 'Bengaluru', destination: 'Goa', date: '2026-07-12' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --include src/app/features/bus-booking/components/bus-search-form/bus-search-form.spec.ts --watch=false
```
Expected: FAIL — component does not exist.

- [ ] **Step 3: Write the implementation**

```ts
// bus-search-form.ts
import { Component, input, output, signal } from '@angular/core';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker';
import { toIsoDate } from '@app/core/dates/date-utils';

@Component({
  selector: 'app-bus-search-form',
  imports: [HlmInputImports, HlmLabelImports, HlmButtonImports, HlmDatePickerImports],
  templateUrl: './bus-search-form.html',
})
export class BusSearchForm {
  public readonly initialSource = input.required<string>();
  public readonly initialDestination = input.required<string>();
  public readonly initialDate = input<Date | undefined>(undefined);

  public readonly search = output<{ source: string; destination: string; date: string }>();

  protected readonly source = signal('');
  protected readonly destination = signal('');
  protected readonly date = signal<Date | undefined>(undefined);

  constructor() {
    this.source.set(this.initialSource());
    this.destination.set(this.initialDestination());
    this.date.set(this.initialDate());
  }

  protected onSourceInput(value: string): void {
    this.source.set(value);
  }

  protected onDestinationInput(value: string): void {
    this.destination.set(value);
  }

  protected onDateChange(date: Date | undefined): void {
    this.date.set(date);
  }

  protected onSearchClick(): void {
    const d = this.date();
    this.search.emit({ source: this.source(), destination: this.destination(), date: d ? toIsoDate(d) : '' });
  }
}
```

```html
<!-- bus-search-form.html -->
<div hlmCard>
  <div hlmCardHeader><h3 hlmCardTitle>Search Buses</h3></div>
  <div hlmCardContent>
    <div class="grid md:grid-cols-4 gap-3">
      <div class="space-y-1.5">
        <label hlmLabel for="source">Source</label>
        <input hlmInput id="source" [value]="source()" (input)="onSourceInput($any($event.target).value)" />
      </div>
      <div class="space-y-1.5">
        <label hlmLabel for="destination">Destination</label>
        <input hlmInput id="destination" [value]="destination()" (input)="onDestinationInput($any($event.target).value)" />
      </div>
      <div class="space-y-1.5">
        <label hlmLabel for="date">Date</label>
        <hlm-date-picker id="date" [date]="date()" (dateChange)="onDateChange($event)">
          <hlm-date-picker-input placeholder="Select date" />
        </hlm-date-picker>
      </div>
      <div class="flex items-end">
        <button hlmBtn class="w-full" (click)="onSearchClick()">Search</button>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --include src/app/features/bus-booking/components/bus-search-form/bus-search-form.spec.ts --watch=false
```
Expected: PASS.

- [ ] **Step 5: Inspect changes (read-only)**

```bash
git status
```

---

### Task 8: `seat-grid` component (extracted + corrected + lock/409 handling)

**Files:**
- Create: `frontend/src/app/features/bus-booking/components/seat-grid/seat-grid.ts`
- Create: `frontend/src/app/features/bus-booking/components/seat-grid/seat-grid.html`
- Test: `frontend/src/app/features/bus-booking/components/seat-grid/seat-grid.spec.ts`

**Interfaces:**
- Consumes: `SeatResponse`, `SeatLayoutResponse` (Task 3); `ScheduleService.lockSeats`/`unlockSeats` (Task 4); `ToastService` (existing, `@app/shared/ui/toast/toast.service`).
- Produces: `SeatGrid` standalone component with inputs `scheduleId: InputSignal<number>`, `layout: InputSignal<SeatLayoutResponse | null>`, `maxSeats: InputSignal<number | undefined>` (optional cap; undefined = uncapped), outputs `selectionChange = output<number[]>()`, `lockExpired = output<void>()` — consumed by `booking-flow` (Task 12).

- [ ] **Step 1: Write the failing test**

```ts
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SeatGrid } from '@app/features/bus-booking/components/seat-grid/seat-grid';
import { ScheduleService } from '@app/features/bus-booking/services/schedule.service';
import { ToastService } from '@app/shared/ui/toast/toast.service';
import { SeatLayoutResponse } from '@app/features/bus-booking/services/schedule.models';

const LAYOUT: SeatLayoutResponse = {
  busId: 1,
  busName: 'Volvo',
  seats: [
    { id: 1, seatNumber: 'A1', seatType: 'WINDOW', deck: 1, status: 'AVAILABLE' },
    { id: 2, seatNumber: 'A2', seatType: 'LADIES', deck: 1, status: 'AVAILABLE' },
  ],
};

async function render(lockSeats = () => of({ scheduleId: 1, lockedSeatIds: [1], lockedAt: '', expiresAt: '', message: '' })) {
  await TestBed.configureTestingModule({
    imports: [SeatGrid],
    providers: [
      { provide: ScheduleService, useValue: { lockSeats, unlockSeats: () => of(undefined) } },
      { provide: ToastService, useValue: { showError: vi.fn(), showSuccess: vi.fn() } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(SeatGrid);
  fixture.componentRef.setInput('scheduleId', 1);
  fixture.componentRef.setInput('layout', LAYOUT);
  fixture.detectChanges();
  return fixture;
}

describe('SeatGrid', () => {
  it('locks a seat and emits selectionChange on successful click', async () => {
    const fixture = await render();
    let emitted: number[] | undefined;
    fixture.componentInstance.selectionChange.subscribe((ids) => (emitted = ids));

    const button = (fixture.nativeElement as HTMLElement).querySelector('button[data-seat-id="1"]') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();

    expect(emitted).toEqual([1]);
  });

  it('reconciles the selection and shows a conflict toast on 409 SEAT_UNAVAILABLE', async () => {
    const lockSeats = () => throwError(() => ({ status: 409, error: { error: { code: 'SEAT_UNAVAILABLE', message: 'locked by another user' } } }));
    const fixture = await render(lockSeats);
    const toast = TestBed.inject(ToastService);

    const button = (fixture.nativeElement as HTMLElement).querySelector('button[data-seat-id="1"]') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();

    expect(toast.showError).toHaveBeenCalledWith('locked by another user');
    expect(fixture.componentInstance.selectedSeatIds()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --include src/app/features/bus-booking/components/seat-grid/seat-grid.spec.ts --watch=false
```
Expected: FAIL — component does not exist.

- [ ] **Step 3: Write the implementation**

```ts
// seat-grid.ts
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { ScheduleService } from '@app/features/bus-booking/services/schedule.service';
import { ToastService } from '@app/shared/ui/toast/toast.service';
import { SeatLayoutResponse, SeatResponse } from '@app/features/bus-booking/services/schedule.models';

@Component({
  selector: 'app-seat-grid',
  imports: [HlmBadgeImports],
  templateUrl: './seat-grid.html',
})
export class SeatGrid {
  public readonly scheduleId = input.required<number>();
  public readonly layout = input<SeatLayoutResponse | null>(null);
  public readonly maxSeats = input<number | undefined>(undefined);

  public readonly selectionChange = output<number[]>();
  public readonly lockExpired = output<void>();

  private readonly scheduleService = inject(ScheduleService);
  private readonly toastService = inject(ToastService);

  protected readonly selectedSeatIds = signal<number[]>([]);
  protected readonly lockExpiresAt = signal<Date | null>(null);
  protected readonly secondsRemaining = signal<number | null>(null);

  private countdownHandle: ReturnType<typeof setInterval> | undefined;

  constructor() {
    effect((onCleanup) => {
      const expiresAt = this.lockExpiresAt();
      if (!expiresAt) return;
      this.countdownHandle = setInterval(() => {
        const remaining = Math.round((expiresAt.getTime() - Date.now()) / 1000);
        if (remaining <= 0) {
          this.secondsRemaining.set(0);
          clearInterval(this.countdownHandle);
          this.lockExpired.emit();
        } else {
          this.secondsRemaining.set(remaining);
        }
      }, 1000);
      onCleanup(() => clearInterval(this.countdownHandle));
    });
  }

  protected seatClasses(seat: SeatResponse): string {
    if (seat.status !== 'AVAILABLE') {
      return 'bg-muted text-muted-foreground border-border cursor-not-allowed';
    }
    if (this.selectedSeatIds().includes(seat.id)) {
      return 'bg-primary text-primary-foreground border-primary hover:bg-primary/90';
    }
    return 'bg-card border-border hover:bg-accent hover:text-accent-foreground';
  }

  protected toggleSeat(seat: SeatResponse): void {
    if (seat.status !== 'AVAILABLE') return;

    const current = this.selectedSeatIds();
    if (current.includes(seat.id)) {
      this.scheduleService.unlockSeats(this.scheduleId(), [seat.id]).subscribe();
      const next = current.filter((id) => id !== seat.id);
      this.selectedSeatIds.set(next);
      this.selectionChange.emit(next);
      return;
    }

    const cap = this.maxSeats();
    if (cap !== undefined && current.length >= cap) {
      this.toastService.showError(`You can only select up to ${cap} seats.`);
      return;
    }

    this.scheduleService.lockSeats({ scheduleId: this.scheduleId(), seatIds: [...current, seat.id] }).subscribe({
      next: (lockResponse) => {
        this.lockExpiresAt.set(new Date(lockResponse.expiresAt));
        const next = [...current, seat.id];
        this.selectedSeatIds.set(next);
        this.selectionChange.emit(next);
      },
      error: (err) => {
        const message = err?.error?.error?.message ?? 'That seat is no longer available.';
        this.toastService.showError(message);
        this.selectionChange.emit(current);
      },
    });
  }
}
```

```html
<!-- seat-grid.html -->
<div class="rounded-xl border bg-muted/20 p-5">
  @if (secondsRemaining() !== null) {
    <p class="text-xs text-center mb-2 text-muted-foreground">
      Seats held for {{ secondsRemaining() }}s
    </p>
  }
  <p class="text-xs text-muted-foreground mb-3 text-center">Driver</p>
  <div class="grid grid-cols-5 gap-2">
    @for (seat of layout()?.seats; track seat.id) {
      <button
        type="button"
        [attr.data-seat-id]="seat.id"
        (click)="toggleSeat(seat)"
        [disabled]="seat.status !== 'AVAILABLE'"
        class="h-8 w-8 rounded-md border grid place-items-center text-[10px] font-medium transition-colors relative"
        [class]="seatClasses(seat)"
      >
        {{ seat.seatNumber }}
        @if (seat.seatType === 'LADIES') {
          <span class="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-pink-500"></span>
        }
      </button>
    }
  </div>
  <div class="flex gap-4 mt-4 text-xs text-muted-foreground justify-center">
    <span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-card border"></span>Available</span>
    <span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-muted border"></span>Unavailable</span>
    <span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-primary"></span>Selected</span>
    <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-pink-500"></span>Ladies</span>
  </div>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --include src/app/features/bus-booking/components/seat-grid/seat-grid.spec.ts --watch=false
```
Expected: PASS.

- [ ] **Step 5: Inspect changes (read-only)**

```bash
git status
```

---

### Task 9: `fare-summary` component

**Files:**
- Create: `frontend/src/app/features/bus-booking/components/fare-summary/fare-summary.ts`
- Create: `frontend/src/app/features/bus-booking/components/fare-summary/fare-summary.html`
- Test: `frontend/src/app/features/bus-booking/components/fare-summary/fare-summary.spec.ts`

**Interfaces:**
- Consumes: `FareBreakdownResponse` (Task 3).
- Produces: `FareSummary` standalone component with input `breakdown: InputSignal<FareBreakdownResponse | null>` — consumed by `booking-flow` (Task 12) and `booking-detail` (Task 16).

- [ ] **Step 1: Write the failing test**

```ts
import { TestBed } from '@angular/core/testing';
import { FareSummary } from '@app/features/bus-booking/components/fare-summary/fare-summary';
import { FareBreakdownResponse } from '@app/features/bus-booking/services/schedule.models';

const BREAKDOWN = {
  subtotal: 1000,
  discountAmount: 0,
  couponDiscount: 100,
  appliedCoupon: 'SAVE100',
  gstAmount: 50,
  taxAmount: 10,
  finalAmount: 960,
} as FareBreakdownResponse;

describe('FareSummary', () => {
  it('renders the applied coupon and final amount', async () => {
    await TestBed.configureTestingModule({ imports: [FareSummary] }).compileComponents();
    const fixture = TestBed.createComponent(FareSummary);
    fixture.componentRef.setInput('breakdown', BREAKDOWN);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('SAVE100');
    expect(text).toContain('960');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --include src/app/features/bus-booking/components/fare-summary/fare-summary.spec.ts --watch=false
```
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// fare-summary.ts
import { Component, input } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { FareBreakdownResponse } from '@app/features/bus-booking/services/schedule.models';

@Component({
  selector: 'app-fare-summary',
  imports: [HlmCardImports],
  templateUrl: './fare-summary.html',
})
export class FareSummary {
  public readonly breakdown = input<FareBreakdownResponse | null>(null);
}
```

```html
<!-- fare-summary.html -->
@if (breakdown(); as b) {
  <div hlmCard>
    <div hlmCardHeader><h3 hlmCardTitle>Fare Summary</h3></div>
    <div hlmCardContent class="space-y-1.5 text-sm">
      <div class="flex justify-between"><span class="text-muted-foreground">Subtotal</span><span>₹{{ b.subtotal }}</span></div>
      @if (b.discountAmount > 0) {
        <div class="flex justify-between text-success"><span>Discount ({{ b.appliedDiscount }})</span><span>-₹{{ b.discountAmount }}</span></div>
      }
      @if (b.couponDiscount > 0) {
        <div class="flex justify-between text-success"><span>Coupon ({{ b.appliedCoupon }})</span><span>-₹{{ b.couponDiscount }}</span></div>
      }
      <div class="flex justify-between"><span class="text-muted-foreground">GST</span><span>₹{{ b.gstAmount }}</span></div>
      <div class="flex justify-between"><span class="text-muted-foreground">Tax</span><span>₹{{ b.taxAmount }}</span></div>
      <div class="flex justify-between font-semibold text-base pt-2 border-t"><span>Total Payable</span><span>₹{{ b.finalAmount }}</span></div>
    </div>
  </div>
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --include src/app/features/bus-booking/components/fare-summary/fare-summary.spec.ts --watch=false
```
Expected: PASS.

- [ ] **Step 5: Inspect changes (read-only)**

```bash
git status
```

---

### Task 10: `passenger-details-form` component

**Files:**
- Create: `frontend/src/app/features/bus-booking/components/passenger-details-form/passenger-details-form.ts`
- Create: `frontend/src/app/features/bus-booking/components/passenger-details-form/passenger-details-form.html`
- Test: `frontend/src/app/features/bus-booking/components/passenger-details-form/passenger-details-form.spec.ts`

**Interfaces:**
- Consumes: `SeatResponse` (Task 3), `PassengerDetailDto` (Task 2).
- Produces: `PassengerDetailsForm` standalone component with input `seats: InputSignal<SeatResponse[]>`, output `detailsChange = output<{ valid: boolean; passengers: PassengerDetailDto[] }>()` — consumed by `booking-flow` (Task 12).

- [ ] **Step 1: Write the failing test**

```ts
import { TestBed } from '@angular/core/testing';
import { PassengerDetailsForm } from '@app/features/bus-booking/components/passenger-details-form/passenger-details-form';
import { SeatResponse } from '@app/features/bus-booking/services/schedule.models';

const SEATS: SeatResponse[] = [
  { id: 1, seatNumber: 'A1', seatType: 'WINDOW', deck: 1, status: 'AVAILABLE' },
  { id: 2, seatNumber: 'A2', seatType: 'LADIES', deck: 1, status: 'AVAILABLE' },
];

describe('PassengerDetailsForm', () => {
  it('locks the gender field to FEMALE for a LADIES seat row', async () => {
    await TestBed.configureTestingModule({ imports: [PassengerDetailsForm] }).compileComponents();
    const fixture = TestBed.createComponent(PassengerDetailsForm);
    fixture.componentRef.setInput('seats', SEATS);
    fixture.detectChanges();

    const genderSelects = (fixture.nativeElement as HTMLElement).querySelectorAll('select[data-role="gender"]');
    const ladiesRowSelect = genderSelects[1] as HTMLSelectElement;
    expect(ladiesRowSelect.disabled).toBe(true);
    expect(ladiesRowSelect.value).toBe('FEMALE');
  });

  it('defaults the primary-passenger radio to the first row and emits FEMALE/MALE/OTHER values', async () => {
    await TestBed.configureTestingModule({ imports: [PassengerDetailsForm] }).compileComponents();
    const fixture = TestBed.createComponent(PassengerDetailsForm);
    fixture.componentRef.setInput('seats', SEATS);
    fixture.detectChanges();

    let emitted: { valid: boolean; passengers: unknown[] } | undefined;
    fixture.componentInstance.detailsChange.subscribe((e) => (emitted = e as { valid: boolean; passengers: unknown[] }));

    const nameInputs = (fixture.nativeElement as HTMLElement).querySelectorAll('input[data-role="name"]');
    (nameInputs[0] as HTMLInputElement).value = 'Alice';
    (nameInputs[0] as HTMLInputElement).dispatchEvent(new Event('input'));
    (nameInputs[1] as HTMLInputElement).value = 'Bob';
    (nameInputs[1] as HTMLInputElement).dispatchEvent(new Event('input'));

    expect(emitted?.passengers.length).toBe(2);
    const primaryRadios = (fixture.nativeElement as HTMLElement).querySelectorAll('input[data-role="primary"]') as NodeListOf<HTMLInputElement>;
    expect(primaryRadios[0].checked).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --include src/app/features/bus-booking/components/passenger-details-form/passenger-details-form.spec.ts --watch=false
```
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// passenger-details-form.ts
import { Component, computed, effect, input, output, signal } from '@angular/core';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { SeatResponse } from '@app/features/bus-booking/services/schedule.models';
import { PassengerDetailDto } from '@app/features/bus-booking/services/booking.models';

interface PassengerRow {
  seatId: number;
  seatNumber: string;
  isLadiesSeat: boolean;
  name: string;
  age: number | null;
  gender: 'FEMALE' | 'MALE' | 'OTHER';
  email: string;
  phone: string;
}

@Component({
  selector: 'app-passenger-details-form',
  imports: [HlmInputImports, HlmLabelImports],
  templateUrl: './passenger-details-form.html',
})
export class PassengerDetailsForm {
  public readonly seats = input.required<SeatResponse[]>();
  public readonly detailsChange = output<{ valid: boolean; passengers: PassengerDetailDto[] }>();

  protected readonly rows = signal<PassengerRow[]>([]);
  protected readonly primarySeatId = signal<number | null>(null);

  constructor() {
    effect(() => {
      const seats = this.seats();
      this.rows.set(
        seats.map((s) => ({
          seatId: s.id,
          seatNumber: s.seatNumber,
          isLadiesSeat: s.seatType === 'LADIES',
          name: '',
          age: null,
          gender: s.seatType === 'LADIES' ? 'FEMALE' : 'OTHER',
          email: '',
          phone: '',
        })),
      );
      if (seats.length > 0) {
        this.primarySeatId.set(seats[0].id);
      }
      this.emit();
    });
  }

  protected readonly isValid = computed(() =>
    this.rows().every((r) => r.name.trim().length > 0 && r.age !== null && r.age > 0),
  );

  protected updateRow(seatId: number, patch: Partial<PassengerRow>): void {
    this.rows.set(this.rows().map((r) => (r.seatId === seatId ? { ...r, ...patch } : r)));
    this.emit();
  }

  protected setPrimary(seatId: number): void {
    this.primarySeatId.set(seatId);
    this.emit();
  }

  private emit(): void {
    const primary = this.primarySeatId();
    const passengers: PassengerDetailDto[] = this.rows().map((r) => ({
      seatId: r.seatId,
      passengerName: r.name,
      passengerAge: r.age ?? 0,
      passengerGender: r.gender,
      passengerEmail: r.email || undefined,
      passengerPhone: r.phone || undefined,
      isPrimary: r.seatId === primary,
    }));
    this.detailsChange.emit({ valid: this.isValid(), passengers });
  }
}
```

```html
<!-- passenger-details-form.html -->
<div class="space-y-4">
  @for (row of rows(); track row.seatId) {
    <div hlmCard class="p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="font-medium text-sm">Seat {{ row.seatNumber }}</h4>
        <label class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="radio"
            name="primaryPassenger"
            data-role="primary"
            [checked]="row.seatId === primarySeatId()"
            (change)="setPrimary(row.seatId)"
          />
          Primary passenger
        </label>
      </div>
      <div class="grid md:grid-cols-2 gap-3">
        <div class="space-y-1.5">
          <label hlmLabel>Name</label>
          <input hlmInput data-role="name" [value]="row.name" (input)="updateRow(row.seatId, { name: $any($event.target).value })" />
        </div>
        <div class="space-y-1.5">
          <label hlmLabel>Age</label>
          <input
            hlmInput
            type="number"
            data-role="age"
            [value]="row.age"
            (input)="updateRow(row.seatId, { age: +$any($event.target).value })"
          />
        </div>
        <div class="space-y-1.5">
          <label hlmLabel>Gender</label>
          <select
            data-role="gender"
            class="border rounded-md h-9 px-2 text-sm w-full"
            [value]="row.gender"
            [disabled]="row.isLadiesSeat"
            (change)="updateRow(row.seatId, { gender: $any($event.target).value })"
          >
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
            <option value="OTHER">Other</option>
          </select>
          @if (row.isLadiesSeat) {
            <p class="text-xs text-muted-foreground">This seat is reserved for female passengers.</p>
          }
        </div>
        <div class="space-y-1.5">
          <label hlmLabel>Phone</label>
          <input hlmInput data-role="phone" [value]="row.phone" (input)="updateRow(row.seatId, { phone: $any($event.target).value })" />
        </div>
      </div>
    </div>
  }
</div>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --include src/app/features/bus-booking/components/passenger-details-form/passenger-details-form.spec.ts --watch=false
```
Expected: PASS.

- [ ] **Step 5: Inspect changes (read-only)**

```bash
git status
```

---

### Task 11: `booking-flow` component (Search → Seats → Passengers → Review)

**Files:**
- Create: `frontend/src/app/features/bus-booking/components/booking-flow/booking-flow.ts`
- Create: `frontend/src/app/features/bus-booking/components/booking-flow/booking-flow.html`
- Test: `frontend/src/app/features/bus-booking/components/booking-flow/booking-flow.spec.ts`

**Interfaces:**
- Consumes: `BusSearchForm` (Task 7), `SeatGrid` (Task 8), `FareSummary` (Task 9), `PassengerDetailsForm` (Task 10), `ScheduleService`/`BookingService` (Tasks 4–5).
- Produces: `BookingFlow` standalone component with optional input `tripId: InputSignal<string | undefined>` — consumed by `bus-booking.routes.ts` (Task 18, standalone) and `trip-travel-tab` (Task 19, embedded).

- [ ] **Step 1: Write the failing test**

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { BookingFlow } from '@app/features/bus-booking/components/booking-flow/booking-flow';
import { ScheduleService } from '@app/features/bus-booking/services/schedule.service';
import { BookingService } from '@app/features/bus-booking/services/booking.service';

describe('BookingFlow', () => {
  it('navigates to confirmation with a tripId query param when tripId input is set', async () => {
    const bookingService = { createBooking: () => of({ id: 99, status: 'CONFIRMED' }) };
    await TestBed.configureTestingModule({
      imports: [BookingFlow],
      providers: [
        provideRouter([]),
        { provide: ScheduleService, useValue: { searchBuses: () => of([]), calculateFare: () => of({ breakdown: {}, totalPayable: 0, totalSavings: 0 }) } },
        { provide: BookingService, useValue: bookingService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(BookingFlow);
    fixture.componentRef.setInput('tripId', 'trip-1');
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    (fixture.componentInstance as unknown as { submitBooking: () => void }).submitBooking();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(['/bus-booking/confirmation', 99], { queryParams: { tripId: 'trip-1' } });
  });

  it('navigates to confirmation with no query params when tripId is not set', async () => {
    const bookingService = { createBooking: () => of({ id: 100, status: 'CONFIRMED' }) };
    await TestBed.configureTestingModule({
      imports: [BookingFlow],
      providers: [
        provideRouter([]),
        { provide: ScheduleService, useValue: { searchBuses: () => of([]), calculateFare: () => of({ breakdown: {}, totalPayable: 0, totalSavings: 0 }) } },
        { provide: BookingService, useValue: bookingService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(BookingFlow);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    (fixture.componentInstance as unknown as { submitBooking: () => void }).submitBooking();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(['/bus-booking/confirmation', 100], { queryParams: {} });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --include src/app/features/bus-booking/components/booking-flow/booking-flow.spec.ts --watch=false
```
Expected: FAIL — component does not exist.

- [ ] **Step 3: Write the implementation**

```ts
// booking-flow.ts
import { Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { BusSearchForm } from '@app/features/bus-booking/components/bus-search-form/bus-search-form';
import { SeatGrid } from '@app/features/bus-booking/components/seat-grid/seat-grid';
import { FareSummary } from '@app/features/bus-booking/components/fare-summary/fare-summary';
import { PassengerDetailsForm } from '@app/features/bus-booking/components/passenger-details-form/passenger-details-form';
import { ScheduleService } from '@app/features/bus-booking/services/schedule.service';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { BusSearchResult, SeatLayoutResponse, FareBreakdownResponse } from '@app/features/bus-booking/services/schedule.models';
import { PassengerDetailDto } from '@app/features/bus-booking/services/booking.models';
import { ToastService } from '@app/shared/ui/toast/toast.service';

type Step = 'search' | 'seats' | 'passengers' | 'review';

@Component({
  selector: 'app-booking-flow',
  imports: [BusSearchForm, SeatGrid, FareSummary, PassengerDetailsForm, HlmButtonImports],
  templateUrl: './booking-flow.html',
})
export class BookingFlow {
  public readonly tripId = input<string | undefined>(undefined);

  private readonly router = inject(Router);
  private readonly scheduleService = inject(ScheduleService);
  private readonly bookingService = inject(BookingService);
  private readonly toastService = inject(ToastService);

  protected readonly step = signal<Step>('search');
  protected readonly results = signal<BusSearchResult[]>([]);
  protected readonly selectedBus = signal<BusSearchResult | null>(null);
  protected readonly seatLayout = signal<SeatLayoutResponse | null>(null);
  protected readonly selectedSeatIds = signal<number[]>([]);
  protected readonly fareBreakdown = signal<FareBreakdownResponse | null>(null);
  protected readonly passengers = signal<PassengerDetailDto[]>([]);
  protected readonly passengersValid = signal(false);
  protected readonly submitting = signal(false);

  protected onSearch(criteria: { source: string; destination: string; date: string }): void {
    this.scheduleService.searchBuses(criteria.source, criteria.destination, criteria.date).subscribe({
      next: (results) => this.results.set(results),
      error: () => this.toastService.showError('Search failed'),
    });
  }

  protected selectBus(bus: BusSearchResult): void {
    this.selectedBus.set(bus);
    this.scheduleService.getSeats(bus.scheduleId).subscribe((layout) => {
      this.seatLayout.set(layout);
      this.step.set('seats');
    });
  }

  protected onSeatSelectionChange(seatIds: number[]): void {
    this.selectedSeatIds.set(seatIds);
    const bus = this.selectedBus();
    if (bus && seatIds.length > 0) {
      this.scheduleService.calculateFare({ scheduleId: bus.scheduleId, seatIds }).subscribe((price) => {
        this.fareBreakdown.set(price.breakdown);
      });
    }
  }

  protected proceedToPassengers(): void {
    this.step.set('passengers');
  }

  protected get selectedSeats() {
    return (this.seatLayout()?.seats ?? []).filter((s) => this.selectedSeatIds().includes(s.id));
  }

  protected onDetailsChange(event: { valid: boolean; passengers: PassengerDetailDto[] }): void {
    this.passengersValid.set(event.valid);
    this.passengers.set(event.passengers);
  }

  protected proceedToReview(): void {
    this.step.set('review');
  }

  protected submitBooking(): void {
    const bus = this.selectedBus();
    if (!bus) return;
    this.submitting.set(true);
    this.bookingService
      .createBooking({
        scheduleId: bus.scheduleId,
        seatIds: this.selectedSeatIds(),
        passengerDetails: this.passengers(),
      })
      .subscribe({
        next: (booking) => {
          this.submitting.set(false);
          const tripId = this.tripId();
          this.router.navigate(['/bus-booking/confirmation', booking.id], {
            queryParams: tripId ? { tripId } : {},
          });
        },
        error: (err) => {
          this.submitting.set(false);
          const msg = err?.error?.error?.message ?? 'Failed to create booking';
          this.toastService.showError(msg);
        },
      });
  }
}
```

```html
<!-- booking-flow.html -->
@switch (step()) {
  @case ('search') {
    <app-bus-search-form initialSource="" initialDestination="" (search)="onSearch($event)" />
    <div class="space-y-3 mt-6">
      @for (bus of results(); track bus.scheduleId) {
        <div hlmCard class="p-4 flex justify-between items-center">
          <div>
            <p class="font-semibold">{{ bus.busName }}</p>
            <p class="text-sm text-muted-foreground">{{ bus.source }} → {{ bus.destination }} · {{ bus.departureTime }}</p>
          </div>
          <button hlmBtn variant="outline" size="sm" (click)="selectBus(bus)">View Seats</button>
        </div>
      }
    </div>
  }
  @case ('seats') {
    <app-seat-grid [scheduleId]="selectedBus()!.scheduleId" [layout]="seatLayout()" (selectionChange)="onSeatSelectionChange($event)" />
    <app-fare-summary [breakdown]="fareBreakdown()" />
    <button hlmBtn class="mt-4" [disabled]="selectedSeatIds().length === 0" (click)="proceedToPassengers()">Continue</button>
  }
  @case ('passengers') {
    <app-passenger-details-form [seats]="selectedSeats" (detailsChange)="onDetailsChange($event)" />
    <button hlmBtn class="mt-4" [disabled]="!passengersValid()" (click)="proceedToReview()">Continue to Review</button>
  }
  @case ('review') {
    <app-fare-summary [breakdown]="fareBreakdown()" />
    <button hlmBtn class="mt-4" [disabled]="submitting()" (click)="submitBooking()">
      @if (submitting()) { Processing… } @else { Confirm & Pay }
    </button>
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --include src/app/features/bus-booking/components/booking-flow/booking-flow.spec.ts --watch=false
```
Expected: PASS, 2 specs.

- [ ] **Step 5: Inspect changes (read-only)**

```bash
git status
```

---

### Task 12: `booking-confirmation` component + route

**Files:**
- Create: `frontend/src/app/features/bus-booking/components/booking-confirmation/booking-confirmation.ts`
- Create: `frontend/src/app/features/bus-booking/components/booking-confirmation/booking-confirmation.html`
- Test: `frontend/src/app/features/bus-booking/components/booking-confirmation/booking-confirmation.spec.ts`

**Interfaces:**
- Consumes: `BookingService.getBookingById`/`attachBookingToTrip` (Task 5).
- Produces: `BookingConfirmation` standalone component reading route params `id` (path) and `tripId` (query, optional) — routed at `bus-booking/confirmation/:id` (wired in Task 18).

- [ ] **Step 1: Write the failing test**

```ts
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { BookingConfirmation } from '@app/features/bus-booking/components/booking-confirmation/booking-confirmation';
import { BookingService } from '@app/features/bus-booking/services/booking.service';

async function render(tripId: string | null) {
  await TestBed.configureTestingModule({
    imports: [BookingConfirmation],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: convertToParamMap({ id: '42' }) },
          queryParamMap: of(convertToParamMap(tripId ? { tripId } : {})),
        },
      },
      {
        provide: BookingService,
        useValue: {
          getBookingById: () => of({ id: 42, bookingReference: 'BK1', status: 'CONFIRMED', totalFare: 500 }),
          attachBookingToTrip: vi.fn(() => of({})),
        },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(BookingConfirmation);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('BookingConfirmation', () => {
  it('shows Attach to this Trip and Back to Trip when tripId query param is present', async () => {
    const fixture = await render('trip-1');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Attach to this Trip');
    expect(text).toContain('Back to Trip');
  });

  it('shows neither action when tripId query param is absent (standalone booking)', async () => {
    const fixture = await render(null);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Attach to this Trip');
    expect(text).not.toContain('Back to Trip');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --include src/app/features/bus-booking/components/booking-confirmation/booking-confirmation.spec.ts --watch=false
```
Expected: FAIL — component does not exist.

- [ ] **Step 3: Write the implementation**

```ts
// booking-confirmation.ts
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { BookingResponse } from '@app/features/bus-booking/services/booking.models';

@Component({
  selector: 'app-booking-confirmation',
  imports: [HlmCardImports, HlmButtonImports, RouterLink],
  templateUrl: './booking-confirmation.html',
})
export class BookingConfirmation {
  private readonly route = inject(ActivatedRoute);
  private readonly bookingService = inject(BookingService);

  protected readonly tripId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('tripId'))),
    { initialValue: null },
  );

  protected readonly booking = signal<BookingResponse | null>(null);
  protected readonly attached = signal(false);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.bookingService.getBookingById(id).subscribe((b) => this.booking.set(b));
  }

  protected attachToTrip(): void {
    const b = this.booking();
    const tripId = this.tripId();
    if (!b || !tripId) return;
    this.bookingService.attachBookingToTrip(tripId, b.id).subscribe(() => this.attached.set(true));
  }
}
```

```html
<!-- booking-confirmation.html -->
@if (booking(); as b) {
  <div hlmCard>
    <div hlmCardHeader><h3 hlmCardTitle>Booking Confirmed</h3></div>
    <div hlmCardContent class="space-y-3">
      <p>Reference: {{ b.bookingReference }}</p>
      <p>Total Fare: ₹{{ b.totalFare }}</p>
      <div class="flex gap-3">
        <a hlmBtn [routerLink]="['/bus-booking', b.id, 'ticket']">View Ticket</a>
        @if (tripId() && !attached()) {
          <button hlmBtn variant="outline" (click)="attachToTrip()">Attach to this Trip?</button>
        }
        @if (tripId()) {
          <a hlmBtn variant="outline" [routerLink]="['/trips', tripId()]">Back to Trip</a>
        }
      </div>
    </div>
  </div>
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --include src/app/features/bus-booking/components/booking-confirmation/booking-confirmation.spec.ts --watch=false
```
Expected: PASS, 2 specs.

- [ ] **Step 5: Inspect changes (read-only)**

```bash
git status
```

---

### Task 13: `ticket-card` shared presentational component

**Files:**
- Create: `frontend/src/app/features/bus-booking/components/ticket-card/ticket-card.ts`
- Create: `frontend/src/app/features/bus-booking/components/ticket-card/ticket-card.html`
- Test: `frontend/src/app/features/bus-booking/components/ticket-card/ticket-card.spec.ts`

**Interfaces:**
- Consumes: `TicketResponse` (Task 2), `angularx-qrcode`'s `QRCodeComponent` (Task 1 — use the exact export/selector confirmed there).
- Produces: `TicketCard` standalone component with input `ticket: InputSignal<TicketResponse | null>` — consumed by `ticket-display` (Task 14) and `ticket-verification` (Task 15).

- [ ] **Step 1: Write the failing test**

```ts
import { TestBed } from '@angular/core/testing';
import { TicketCard } from '@app/features/bus-booking/components/ticket-card/ticket-card';
import { TicketResponse } from '@app/features/bus-booking/services/booking.models';

const TICKET = {
  bookingReference: 'BK123',
  ticketNumber: 'TCK-1',
  qrCodeString: 'qr-payload',
  busName: 'Volvo',
  source: 'Bengaluru',
  destination: 'Goa',
  primaryPassengerName: 'Alice',
  totalPassengers: 2,
  totalFare: 1800,
} as TicketResponse;

describe('TicketCard', () => {
  it('renders ticket fields and no download action', async () => {
    await TestBed.configureTestingModule({ imports: [TicketCard] }).compileComponents();
    const fixture = TestBed.createComponent(TicketCard);
    fixture.componentRef.setInput('ticket', TICKET);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('TCK-1');
    expect(text).toContain('Alice');
    expect(text).not.toContain('Download');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --include src/app/features/bus-booking/components/ticket-card/ticket-card.spec.ts --watch=false
```
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// ticket-card.ts
import { Component, input } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { QRCodeComponent } from 'angularx-qrcode';
import { TicketResponse } from '@app/features/bus-booking/services/booking.models';

@Component({
  selector: 'app-ticket-card',
  imports: [HlmCardImports, QRCodeComponent],
  templateUrl: './ticket-card.html',
})
export class TicketCard {
  public readonly ticket = input<TicketResponse | null>(null);
}
```

```html
<!-- ticket-card.html -->
@if (ticket(); as t) {
  <div hlmCard>
    <div hlmCardHeader><h3 hlmCardTitle>{{ t.busName }}</h3></div>
    <div hlmCardContent class="flex flex-col md:flex-row gap-6 items-center">
      <qrcode [qrdata]="t.qrCodeString" [width]="140" />
      <div class="space-y-1 text-sm">
        <p>Ticket: {{ t.ticketNumber }}</p>
        <p>Reference: {{ t.bookingReference }}</p>
        <p>{{ t.source }} → {{ t.destination }}</p>
        <p>Primary passenger: {{ t.primaryPassengerName }} ({{ t.totalPassengers }} total)</p>
        <p class="font-semibold">₹{{ t.totalFare }}</p>
      </div>
    </div>
  </div>
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --include src/app/features/bus-booking/components/ticket-card/ticket-card.spec.ts --watch=false
```
Expected: PASS.

- [ ] **Step 5: Inspect changes (read-only)**

```bash
git status
```

---

### Task 14: `ticket-display` (authenticated) component + route

**Files:**
- Create: `frontend/src/app/features/bus-booking/components/ticket-display/ticket-display.ts`
- Create: `frontend/src/app/features/bus-booking/components/ticket-display/ticket-display.html`
- Test: `frontend/src/app/features/bus-booking/components/ticket-display/ticket-display.spec.ts`

**Interfaces:**
- Consumes: `TicketCard` (Task 13), `BookingService.getTicket` (Task 5).
- Produces: `TicketDisplay` component — routed at `bus-booking/:id/ticket` (Task 18).

- [ ] **Step 1: Write the failing test**

```ts
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { TicketDisplay } from '@app/features/bus-booking/components/ticket-display/ticket-display';
import { BookingService } from '@app/features/bus-booking/services/booking.service';

describe('TicketDisplay', () => {
  it('fetches the ticket for the routed booking id and renders it', async () => {
    const getTicket = vi.fn(() => of({ ticketNumber: 'TCK-9', bookingReference: 'BK9' }));
    await TestBed.configureTestingModule({
      imports: [TicketDisplay],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '9' }) } } },
        { provide: BookingService, useValue: { getTicket } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(TicketDisplay);
    fixture.detectChanges();
    expect(getTicket).toHaveBeenCalledWith(9);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('TCK-9');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --include src/app/features/bus-booking/components/ticket-display/ticket-display.spec.ts --watch=false
```
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// ticket-display.ts
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TicketCard } from '@app/features/bus-booking/components/ticket-card/ticket-card';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { TicketResponse } from '@app/features/bus-booking/services/booking.models';

@Component({
  selector: 'app-ticket-display',
  imports: [TicketCard],
  templateUrl: './ticket-display.html',
})
export class TicketDisplay {
  private readonly route = inject(ActivatedRoute);
  private readonly bookingService = inject(BookingService);

  protected readonly ticket = signal<TicketResponse | null>(null);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.bookingService.getTicket(id).subscribe((t) => this.ticket.set(t));
  }
}
```

```html
<!-- ticket-display.html -->
<app-ticket-card [ticket]="ticket()" />
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --include src/app/features/bus-booking/components/ticket-display/ticket-display.spec.ts --watch=false
```
Expected: PASS.

- [ ] **Step 5: Inspect changes (read-only)**

```bash
git status
```

---

### Task 15: `ticket-verification` (public) component + route

**Files:**
- Create: `frontend/src/app/features/bus-booking/components/ticket-verification/ticket-verification.ts`
- Create: `frontend/src/app/features/bus-booking/components/ticket-verification/ticket-verification.html`
- Test: `frontend/src/app/features/bus-booking/components/ticket-verification/ticket-verification.spec.ts`
- Modify: `frontend/src/app/app.routes.ts`

**Interfaces:**
- Consumes: `TicketCard` (Task 13), `BookingService.verifyTicket` (Task 5).
- Produces: `TicketVerification` component, routed publicly (no guard) at `verify-ticket`.

- [ ] **Step 1: Write the failing test**

```ts
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TicketVerification } from '@app/features/bus-booking/components/ticket-verification/ticket-verification';
import { BookingService } from '@app/features/bus-booking/services/booking.service';

describe('TicketVerification', () => {
  it('looks up a ticket by number and shows it on success', async () => {
    const verifyTicket = vi.fn(() => of({ ticketNumber: 'TCK-7', bookingReference: 'BK7' }));
    await TestBed.configureTestingModule({
      imports: [TicketVerification],
      providers: [{ provide: BookingService, useValue: { verifyTicket } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(TicketVerification);
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    input.value = 'TCK-7';
    input.dispatchEvent(new Event('input'));
    const button = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(verifyTicket).toHaveBeenCalledWith('TCK-7');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('TCK-7');
  });

  it('shows an error message when the ticket number is not found', async () => {
    const verifyTicket = vi.fn(() => throwError(() => ({ status: 404 })));
    await TestBed.configureTestingModule({
      imports: [TicketVerification],
      providers: [{ provide: BookingService, useValue: { verifyTicket } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(TicketVerification);
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    input.value = 'BAD';
    input.dispatchEvent(new Event('input'));
    const button = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('not found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --include src/app/features/bus-booking/components/ticket-verification/ticket-verification.spec.ts --watch=false
```
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// ticket-verification.ts
import { Component, inject, signal } from '@angular/core';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { TicketCard } from '@app/features/bus-booking/components/ticket-card/ticket-card';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { TicketResponse } from '@app/features/bus-booking/services/booking.models';

@Component({
  selector: 'app-ticket-verification',
  imports: [HlmInputImports, HlmButtonImports, TicketCard],
  templateUrl: './ticket-verification.html',
})
export class TicketVerification {
  private readonly bookingService = inject(BookingService);

  protected readonly ticketNumber = signal('');
  protected readonly ticket = signal<TicketResponse | null>(null);
  protected readonly error = signal<string | null>(null);

  protected onInput(value: string): void {
    this.ticketNumber.set(value);
  }

  protected verify(): void {
    this.error.set(null);
    this.ticket.set(null);
    this.bookingService.verifyTicket(this.ticketNumber()).subscribe({
      next: (t) => this.ticket.set(t),
      error: () => this.error.set('Ticket not found. Please check the ticket number.'),
    });
  }
}
```

```html
<!-- ticket-verification.html -->
<div class="max-w-md mx-auto mt-12 space-y-4">
  <h2 class="text-lg font-semibold">Verify a Ticket</h2>
  <div class="flex gap-2">
    <input hlmInput placeholder="Ticket number" [value]="ticketNumber()" (input)="onInput($any($event.target).value)" />
    <button hlmBtn (click)="verify()">Verify</button>
  </div>
  @if (error()) {
    <p class="text-sm text-destructive">{{ error() }}</p>
  }
  <app-ticket-card [ticket]="ticket()" />
</div>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --include src/app/features/bus-booking/components/ticket-verification/ticket-verification.spec.ts --watch=false
```
Expected: PASS, 2 specs.

- [ ] **Step 5: Add the public route**

In `frontend/src/app/app.routes.ts`, add a sibling top-level entry (no `authGuard`) alongside the existing role-group entries:
```ts
{
  path: 'verify-ticket',
  loadComponent: () =>
    import('@app/features/bus-booking/components/ticket-verification/ticket-verification').then(
      (m) => m.TicketVerification,
    ),
},
```
Place it before the wildcard 404 `RoutePlaceholder` entry, alongside the other top-level groups (`activity`, `hotel`, `transport`, `admin`, and the traveler `path: ''` entry) — read the file first to confirm exact insertion point and existing formatting.

- [ ] **Step 6: Verify the route resolves**

```bash
npx ng build
```
Expected: build succeeds with no route-configuration errors.

- [ ] **Step 7: Inspect changes (read-only)**

```bash
git status
git diff --stat
```

---

### Task 16: `my-bookings` list page + route

**Files:**
- Create: `frontend/src/app/features/bus-booking/components/my-bookings/my-bookings.ts`
- Create: `frontend/src/app/features/bus-booking/components/my-bookings/my-bookings.html`
- Test: `frontend/src/app/features/bus-booking/components/my-bookings/my-bookings.spec.ts`

**Interfaces:**
- Consumes: `BookingService.getBookings` (Task 5).
- Produces: `MyBookings` component — routed at `bus-booking` (empty path child, Task 18).

- [ ] **Step 1: Write the failing test**

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MyBookings } from '@app/features/bus-booking/components/my-bookings/my-bookings';
import { BookingService } from '@app/features/bus-booking/services/booking.service';

describe('MyBookings', () => {
  it('renders each booking reference and route/fare returned by the service', async () => {
    const getBookings = vi.fn(() =>
      of({
        content: [
          { id: 1, bookingReference: 'BK1', source: 'Bengaluru', destination: 'Goa', travelDate: '2026-07-12', totalFare: 1800, status: 'CONFIRMED', seatsBooked: 2 },
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        last: true,
      }),
    );
    await TestBed.configureTestingModule({
      imports: [MyBookings],
      providers: [provideRouter([]), { provide: BookingService, useValue: { getBookings } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(MyBookings);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('BK1');
    expect(text).toContain('1800');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --include src/app/features/bus-booking/components/my-bookings/my-bookings.spec.ts --watch=false
```
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// my-bookings.ts
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { BookingHistoryResponse } from '@app/features/bus-booking/services/booking.models';

@Component({
  selector: 'app-my-bookings',
  imports: [HlmCardImports, RouterLink],
  templateUrl: './my-bookings.html',
})
export class MyBookings {
  private readonly bookingService = inject(BookingService);

  protected readonly bookings = signal<BookingHistoryResponse[]>([]);
  protected readonly loading = signal(true);

  constructor() {
    this.bookingService.getBookings({}).subscribe({
      next: (page) => {
        this.bookings.set(page.content);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
```

```html
<!-- my-bookings.html -->
<div class="space-y-3">
  @if (loading()) {
    <p class="text-sm text-muted-foreground py-4">Loading bookings…</p>
  } @else if (bookings().length === 0) {
    <p class="text-sm text-muted-foreground py-4">No bookings yet.</p>
  } @else {
    @for (b of bookings(); track b.id) {
      <a [routerLink]="['/bus-booking', b.id]" hlmCard class="p-4 flex justify-between items-center block">
        <div>
          <p class="font-medium">{{ b.bookingReference }}</p>
          <p class="text-xs text-muted-foreground">{{ b.source }} → {{ b.destination }} · {{ b.travelDate }}</p>
        </div>
        <div class="text-right">
          <p class="font-semibold">₹{{ b.totalFare }}</p>
          <p class="text-xs text-muted-foreground">{{ b.status }}</p>
        </div>
      </a>
    }
  }
</div>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --include src/app/features/bus-booking/components/my-bookings/my-bookings.spec.ts --watch=false
```
Expected: PASS.

- [ ] **Step 5: Inspect changes (read-only)**

```bash
git status
```

---

### Task 17: `booking-detail` page (detail/timeline/modify) + route

**Files:**
- Create: `frontend/src/app/features/bus-booking/components/booking-detail/booking-detail.ts`
- Create: `frontend/src/app/features/bus-booking/components/booking-detail/booking-detail.html`
- Test: `frontend/src/app/features/bus-booking/components/booking-detail/booking-detail.spec.ts`

**Interfaces:**
- Consumes: `BookingService.getBookingById`/`getBookingTimeline`/`modifyBooking` (Task 5), `FareSummary` (Task 9, reused for read-only fare display — pass a synthetic breakdown-shaped object built from `BookingResponse` fields, since no live fare-breakdown call is made here).
- Produces: `BookingDetail` component — routed at `bus-booking/:id` (Task 18). **No Trip-attachment indicator or Detach action anywhere on this page** — per the locked Section G correction, this is intentionally absent, not an oversight.

- [ ] **Step 1: Write the failing test**

```ts
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { BookingDetail } from '@app/features/bus-booking/components/booking-detail/booking-detail';
import { BookingService } from '@app/features/bus-booking/services/booking.service';

describe('BookingDetail', () => {
  it('renders the booking reference, status, and timeline, with no Trip-attachment UI', async () => {
    await TestBed.configureTestingModule({
      imports: [BookingDetail],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
        {
          provide: BookingService,
          useValue: {
            getBookingById: () => of({ id: 5, bookingReference: 'BK5', status: 'CONFIRMED', totalFare: 900 }),
            getBookingTimeline: () => of([{ event: 'BOOKING_CREATED', description: 'created', occurredAt: '2026-07-09T10:00:00' }]),
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(BookingDetail);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('BK5');
    expect(text).toContain('created');
    expect(text).not.toContain('Attached to');
    expect(text).not.toContain('Detach');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --include src/app/features/bus-booking/components/booking-detail/booking-detail.spec.ts --watch=false
```
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// booking-detail.ts
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { BookingResponse, BookingTimelineResponse } from '@app/features/bus-booking/services/booking.models';

const NON_MODIFIABLE = new Set(['CANCELLED', 'COMPLETED', 'EXPIRED', 'FAILED']);
const CANCELLABLE_FULL = new Set(['CONFIRMED', 'PENDING', 'RESERVED']);

@Component({
  selector: 'app-booking-detail',
  imports: [HlmCardImports, HlmButtonImports],
  templateUrl: './booking-detail.html',
})
export class BookingDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly bookingService = inject(BookingService);

  protected readonly booking = signal<BookingResponse | null>(null);
  protected readonly timeline = signal<BookingTimelineResponse[]>([]);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.bookingService.getBookingById(id).subscribe((b) => this.booking.set(b));
    this.bookingService.getBookingTimeline(id).subscribe((t) => this.timeline.set(t));
  }

  protected canModify(): boolean {
    const status = this.booking()?.status;
    return !!status && !NON_MODIFIABLE.has(status);
  }

  protected canCancelFull(): boolean {
    const status = this.booking()?.status;
    return !!status && CANCELLABLE_FULL.has(status);
  }

  protected canPartialCancel(): boolean {
    const b = this.booking();
    return b?.status === 'CONFIRMED' && b.seats.length > 1;
  }
}
```

```html
<!-- booking-detail.html -->
@if (booking(); as b) {
  <div hlmCard>
    <div hlmCardHeader><h3 hlmCardTitle>{{ b.bookingReference }}</h3></div>
    <div hlmCardContent class="space-y-3">
      <p>Status: {{ b.status }}</p>
      <p>Total Fare: ₹{{ b.totalFare }}</p>
      <div class="flex gap-2">
        @if (canModify()) {
          <button hlmBtn variant="outline" size="sm">Modify</button>
        }
        @if (canCancelFull()) {
          <button hlmBtn variant="destructive" size="sm">Cancel Booking</button>
        }
        @if (canPartialCancel()) {
          <button hlmBtn variant="outline" size="sm">Cancel Some Seats</button>
        }
      </div>
      <div class="pt-3 border-t">
        <h4 class="font-medium text-sm mb-2">Timeline</h4>
        @for (t of timeline(); track t.occurredAt) {
          <p class="text-xs text-muted-foreground">{{ t.occurredAt }} — {{ t.description }}</p>
        }
      </div>
    </div>
  </div>
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --include src/app/features/bus-booking/components/booking-detail/booking-detail.spec.ts --watch=false
```
Expected: PASS.

- [ ] **Step 5: Inspect changes (read-only)**

```bash
git status
```

---

### Task 18: `cancel-booking-dialog` (full cancellation, "Estimated" preview) + wire into `booking-detail`

**Files:**
- Create: `frontend/src/app/features/bus-booking/components/cancel-booking-dialog/cancel-booking-dialog.ts`
- Create: `frontend/src/app/features/bus-booking/components/cancel-booking-dialog/cancel-booking-dialog.html`
- Test: `frontend/src/app/features/bus-booking/components/cancel-booking-dialog/cancel-booking-dialog.spec.ts`
- Modify: `frontend/src/app/features/bus-booking/components/booking-detail/booking-detail.ts` / `.html` (wire the "Cancel Booking" button to open this dialog)

**Interfaces:**
- Consumes: `ScheduleService.getCancellationPreview` (Task 4), `BookingService.cancelBooking` (Task 5).
- Produces: `CancelBookingDialog` standalone component with inputs `bookingId: InputSignal<number>`, `scheduleId: InputSignal<number>`, `totalFare: InputSignal<number>`, output `cancelled = output<CancellationResponse>()`.

- [ ] **Step 1: Write the failing test**

```ts
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CancelBookingDialog } from '@app/features/bus-booking/components/cancel-booking-dialog/cancel-booking-dialog';
import { ScheduleService } from '@app/features/bus-booking/services/schedule.service';
import { BookingService } from '@app/features/bus-booking/services/booking.service';

describe('CancelBookingDialog', () => {
  it('labels the preview figure as Estimated and uses the real CancellationResponse numbers after confirming', async () => {
    const getCancellationPreview = vi.fn(() =>
      of({ scheduleId: 1, originalFare: 1000, cancellationChargePercent: 10, cancellationCharge: 100, refundPercent: 90, refundableAmount: 900 }),
    );
    const cancelBooking = vi.fn(() =>
      of({ bookingId: 5, cancellationCharge: 150, refundAmount: 850, status: 'CANCELLED' }),
    );
    await TestBed.configureTestingModule({
      imports: [CancelBookingDialog],
      providers: [
        { provide: ScheduleService, useValue: { getCancellationPreview } },
        { provide: BookingService, useValue: { cancelBooking } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CancelBookingDialog);
    fixture.componentRef.setInput('bookingId', 5);
    fixture.componentRef.setInput('scheduleId', 1);
    fixture.componentRef.setInput('totalFare', 1000);
    fixture.detectChanges();

    let text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Estimated');
    expect(text).toContain('900');

    let emitted: { refundAmount: number } | undefined;
    fixture.componentInstance.cancelled.subscribe((r) => (emitted = r as { refundAmount: number }));
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Confirm Cancellation'),
    )!;
    button.click();
    await fixture.whenStable();

    expect(emitted?.refundAmount).toBe(850);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --include src/app/features/bus-booking/components/cancel-booking-dialog/cancel-booking-dialog.spec.ts --watch=false
```
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// cancel-booking-dialog.ts
import { Component, inject, input, output, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { ScheduleService } from '@app/features/bus-booking/services/schedule.service';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { CancellationPreviewResponse } from '@app/features/bus-booking/services/schedule.models';
import { CancellationResponse } from '@app/features/bus-booking/services/booking.models';

@Component({
  selector: 'app-cancel-booking-dialog',
  imports: [HlmButtonImports],
  templateUrl: './cancel-booking-dialog.html',
})
export class CancelBookingDialog {
  public readonly bookingId = input.required<number>();
  public readonly scheduleId = input.required<number>();
  public readonly totalFare = input.required<number>();
  public readonly cancelled = output<CancellationResponse>();

  private readonly scheduleService = inject(ScheduleService);
  private readonly bookingService = inject(BookingService);

  protected readonly preview = signal<CancellationPreviewResponse | null>(null);
  protected readonly cancelling = signal(false);

  constructor() {
    // Preview fetched eagerly since inputs are set synchronously by the parent before first render.
    this.scheduleService.getCancellationPreview(this.scheduleId(), this.totalFare()).subscribe((p) => this.preview.set(p));
  }

  protected confirmCancel(): void {
    this.cancelling.set(true);
    this.bookingService.cancelBooking(this.bookingId(), { bookingId: this.bookingId(), reason: 'OTHER' }).subscribe((res) => {
      this.cancelling.set(false);
      this.cancelled.emit(res);
    });
  }
}
```

```html
<!-- cancel-booking-dialog.html -->
@if (preview(); as p) {
  <div class="space-y-2 text-sm">
    <p class="text-xs uppercase tracking-wide text-muted-foreground">Estimated</p>
    <div class="flex justify-between"><span>Cancellation charge</span><span>₹{{ p.cancellationCharge }}</span></div>
    <div class="flex justify-between font-medium"><span>Refundable amount</span><span>₹{{ p.refundableAmount }}</span></div>
    <p class="text-xs text-muted-foreground">Final amounts are confirmed only after you cancel.</p>
  </div>
}
<button hlmBtn variant="destructive" class="mt-4" [disabled]="cancelling()" (click)="confirmCancel()">
  @if (cancelling()) { Cancelling… } @else { Confirm Cancellation }
</button>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --include src/app/features/bus-booking/components/cancel-booking-dialog/cancel-booking-dialog.spec.ts --watch=false
```
Expected: PASS.

- [ ] **Step 5: Wire the dialog into `booking-detail`**

In `booking-detail.ts`, add a `showCancelDialog = signal(false)` and import `CancelBookingDialog`. In `booking-detail.html`, replace the plain "Cancel Booking" button with one that sets `showCancelDialog.set(true)`, and conditionally render:
```html
@if (showCancelDialog()) {
  <app-cancel-booking-dialog
    [bookingId]="b.id"
    [scheduleId]="b.scheduleId"
    [totalFare]="b.totalFare"
    (cancelled)="onCancelled($event)"
  />
}
```
with an `onCancelled(response)` handler in `booking-detail.ts` that re-fetches the booking (`getBookingById`) to reflect the new `CANCELLED` status and hides the dialog.

- [ ] **Step 6: Run `booking-detail`'s tests to confirm the wiring didn't break anything**

```bash
npx ng test --include src/app/features/bus-booking/components/booking-detail/booking-detail.spec.ts --watch=false
```
Expected: PASS (same test as Task 17, unaffected by the new optional dialog).

- [ ] **Step 7: Inspect changes (read-only)**

```bash
git status
git diff --stat
```

---

### Task 19: `partial-cancel-dialog` ("cancel all seats" block message) + wire into `booking-detail`

**Files:**
- Create: `frontend/src/app/features/bus-booking/components/partial-cancel-dialog/partial-cancel-dialog.ts`
- Create: `frontend/src/app/features/bus-booking/components/partial-cancel-dialog/partial-cancel-dialog.html`
- Test: `frontend/src/app/features/bus-booking/components/partial-cancel-dialog/partial-cancel-dialog.spec.ts`
- Modify: `frontend/src/app/features/bus-booking/components/booking-detail/booking-detail.ts` / `.html`

**Interfaces:**
- Consumes: `BookingSeatResponse[]` (Task 2), `BookingService.partialCancelBooking` (Task 5).
- Produces: `PartialCancelDialog` standalone component with inputs `bookingId: InputSignal<number>`, `seats: InputSignal<BookingSeatResponse[]>`, output `cancelled = output<CancellationResponse>()`.

- [ ] **Step 1: Write the failing test**

```ts
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PartialCancelDialog } from '@app/features/bus-booking/components/partial-cancel-dialog/partial-cancel-dialog';
import { BookingService } from '@app/features/bus-booking/services/booking.service';

const SEATS = [
  { seatId: 1, seatNumber: 'A1', passengerName: 'Alice', passengerAge: 30, passengerGender: 'FEMALE', isPrimary: true },
  { seatId: 2, seatNumber: 'A2', passengerName: 'Bob', passengerAge: 28, passengerGender: 'MALE', isPrimary: false },
];

describe('PartialCancelDialog', () => {
  it('disables confirmation and shows the exact block message when every seat is selected', async () => {
    await TestBed.configureTestingModule({
      imports: [PartialCancelDialog],
      providers: [{ provide: BookingService, useValue: { partialCancelBooking: vi.fn() } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(PartialCancelDialog);
    fixture.componentRef.setInput('bookingId', 5);
    fixture.componentRef.setInput('seats', SEATS);
    fixture.detectChanges();

    const checkboxes = (fixture.nativeElement as HTMLElement).querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    checkboxes[0].click();
    checkboxes[1].click();
    fixture.detectChanges();

    const confirmButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Confirm Partial Cancellation'),
    )!;
    expect(confirmButton.disabled).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('To cancel all seats, use Cancel Booking.');
  });

  it('calls partialCancelBooking with only the selected seat ids when fewer than all seats are selected', async () => {
    const partialCancelBooking = vi.fn(() => of({ bookingId: 5, status: 'CONFIRMED' }));
    await TestBed.configureTestingModule({
      imports: [PartialCancelDialog],
      providers: [{ provide: BookingService, useValue: { partialCancelBooking } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(PartialCancelDialog);
    fixture.componentRef.setInput('bookingId', 5);
    fixture.componentRef.setInput('seats', SEATS);
    fixture.detectChanges();

    const checkboxes = (fixture.nativeElement as HTMLElement).querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    checkboxes[0].click();
    fixture.detectChanges();

    const confirmButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Confirm Partial Cancellation'),
    )!;
    expect(confirmButton.disabled).toBe(false);
    confirmButton.click();

    expect(partialCancelBooking).toHaveBeenCalledWith({ bookingId: 5, seatIds: [1], reason: 'OTHER' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --include src/app/features/bus-booking/components/partial-cancel-dialog/partial-cancel-dialog.spec.ts --watch=false
```
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// partial-cancel-dialog.ts
import { Component, inject, input, output, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { BookingSeatResponse, CancellationResponse } from '@app/features/bus-booking/services/booking.models';

@Component({
  selector: 'app-partial-cancel-dialog',
  imports: [HlmButtonImports],
  templateUrl: './partial-cancel-dialog.html',
})
export class PartialCancelDialog {
  public readonly bookingId = input.required<number>();
  public readonly seats = input.required<BookingSeatResponse[]>();
  public readonly cancelled = output<CancellationResponse>();

  private readonly bookingService = inject(BookingService);

  protected readonly selectedSeatIds = signal<number[]>([]);

  protected toggleSeat(seatId: number): void {
    const current = this.selectedSeatIds();
    this.selectedSeatIds.set(current.includes(seatId) ? current.filter((id) => id !== seatId) : [...current, seatId]);
  }

  protected isAllSelected(): boolean {
    return this.selectedSeatIds().length === this.seats().length && this.seats().length > 0;
  }

  protected canConfirm(): boolean {
    return this.selectedSeatIds().length > 0 && !this.isAllSelected();
  }

  protected confirmPartialCancel(): void {
    if (!this.canConfirm()) return;
    this.bookingService
      .partialCancelBooking({ bookingId: this.bookingId(), seatIds: this.selectedSeatIds(), reason: 'OTHER' })
      .subscribe((res) => this.cancelled.emit(res));
  }
}
```

```html
<!-- partial-cancel-dialog.html -->
<div class="space-y-2">
  @for (seat of seats(); track seat.seatId) {
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" [checked]="selectedSeatIds().includes(seat.seatId)" (change)="toggleSeat(seat.seatId)" />
      Seat {{ seat.seatNumber }} — {{ seat.passengerName }}
    </label>
  }
  @if (isAllSelected()) {
    <p class="text-sm text-destructive">To cancel all seats, use Cancel Booking.</p>
  }
  <button hlmBtn variant="destructive" [disabled]="!canConfirm()" (click)="confirmPartialCancel()">
    Confirm Partial Cancellation
  </button>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --include src/app/features/bus-booking/components/partial-cancel-dialog/partial-cancel-dialog.spec.ts --watch=false
```
Expected: PASS, 2 specs.

- [ ] **Step 5: Wire into `booking-detail`**

Same pattern as Task 18 Step 5: a `showPartialCancelDialog` signal toggled by the "Cancel Some Seats" button, rendering `<app-partial-cancel-dialog [bookingId]="b.id" [seats]="b.seats" (cancelled)="onCancelled($event)" />` conditionally.

- [ ] **Step 6: Re-run `booking-detail`'s tests**

```bash
npx ng test --include src/app/features/bus-booking/components/booking-detail/booking-detail.spec.ts --watch=false
```
Expected: PASS.

- [ ] **Step 7: Inspect changes (read-only)**

```bash
git status
git diff --stat
```

---

### Task 20: Refund display within `booking-detail`

**Files:**
- Modify: `frontend/src/app/features/bus-booking/components/booking-detail/booking-detail.ts` / `.html`
- Modify: `frontend/src/app/features/bus-booking/components/booking-detail/booking-detail.spec.ts`

**Interfaces:**
- Consumes: `BookingService.getRefundsByBooking` (Task 5).

- [ ] **Step 1: Write the failing test**

Add to `booking-detail.spec.ts`:
```ts
it('shows refund details after a cancellation, fetched by bookingId only', async () => {
  const getRefundsByBooking = vi.fn(() => of([{ id: 1, refundReference: 'RF1', netRefundable: 850, status: 'COMPLETED' }]));
  await TestBed.configureTestingModule({
    imports: [BookingDetail],
    providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
      {
        provide: BookingService,
        useValue: {
          getBookingById: () => of({ id: 5, bookingReference: 'BK5', status: 'CANCELLED', totalFare: 900, seats: [] }),
          getBookingTimeline: () => of([]),
          getRefundsByBooking,
        },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(BookingDetail);
  fixture.detectChanges();
  expect(getRefundsByBooking).toHaveBeenCalledWith(5);
  expect((fixture.nativeElement as HTMLElement).textContent).toContain('RF1');
});
```
(Add the necessary `ActivatedRoute`/`convertToParamMap`/`of` imports at the top of the spec file if not already present from Task 17.)

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --include src/app/features/bus-booking/components/booking-detail/booking-detail.spec.ts --watch=false
```
Expected: FAIL — no refund fetch/display exists yet.

- [ ] **Step 3: Implement**

In `booking-detail.ts`, add:
```ts
protected readonly refunds = signal<RefundResponse[]>([]);
```
and in the constructor, after the existing timeline fetch:
```ts
this.bookingService.getRefundsByBooking(id).subscribe((r) => this.refunds.set(r));
```
(import `RefundResponse` from `@app/features/bus-booking/services/booking.models`). In `booking-detail.html`, add after the timeline block:
```html
@if (refunds().length > 0) {
  <div class="pt-3 border-t">
    <h4 class="font-medium text-sm mb-2">Refunds</h4>
    @for (r of refunds(); track r.id) {
      <p class="text-xs text-muted-foreground">{{ r.refundReference }} — ₹{{ r.netRefundable }} ({{ r.status }})</p>
    }
  </div>
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --include src/app/features/bus-booking/components/booking-detail/booking-detail.spec.ts --watch=false
```
Expected: PASS, all specs in this file (Task 17's + this one).

- [ ] **Step 5: Inspect changes (read-only)**

```bash
git status
git diff --stat
```

---

### Task 21: `bus-booking.routes.ts` + register under `traveler.routes.ts`

**Files:**
- Create: `frontend/src/app/features/bus-booking/bus-booking.routes.ts`
- Modify: `frontend/src/app/features/traveler/traveler.routes.ts`

**Interfaces:**
- Consumes: every routed component from Tasks 11–17 (`BookingFlow`, `MyBookings`, `BookingDetail`, `BookingConfirmation`, `TicketDisplay`).

- [ ] **Step 1: Write the route table**

```ts
// bus-booking.routes.ts
import { Routes } from '@angular/router';

export const BUS_BOOKING_ROUTES: Routes = [
  { path: '', loadComponent: () => import('@app/features/bus-booking/components/my-bookings/my-bookings').then((m) => m.MyBookings) },
  { path: 'new', loadComponent: () => import('@app/features/bus-booking/components/booking-flow/booking-flow').then((m) => m.BookingFlow) },
  {
    path: 'confirmation/:id',
    loadComponent: () =>
      import('@app/features/bus-booking/components/booking-confirmation/booking-confirmation').then((m) => m.BookingConfirmation),
  },
  { path: ':id/ticket', loadComponent: () => import('@app/features/bus-booking/components/ticket-display/ticket-display').then((m) => m.TicketDisplay) },
  { path: ':id', loadComponent: () => import('@app/features/bus-booking/components/booking-detail/booking-detail').then((m) => m.BookingDetail) },
];
```
Note the ordering: `confirmation/:id` and `:id/ticket` must be declared **before** the bare `:id` route, otherwise Angular's router would match `confirmation` or a numeric id followed by `/ticket` against the wrong route first.

- [ ] **Step 2: Register as a child of the traveler shell**

Read `traveler.routes.ts` first to find its `children:` array (already containing entries for `dashboard`, `trips`, `expenses`, `profile`, `notifications`, `invitations`, `support`), then add:
```ts
{
  path: 'bus-booking',
  loadChildren: () => import('@app/features/bus-booking/bus-booking.routes').then((m) => m.BUS_BOOKING_ROUTES),
},
```

- [ ] **Step 3: Verify the build resolves every lazy import**

```bash
npx ng build
```
Expected: build succeeds with no unresolved dynamic import errors.

- [ ] **Step 4: Inspect changes (read-only)**

```bash
git status
git diff --stat
```

---

### Task 22: Navigation — `NAV_MAP` entry + "New Booking" CTA

**Files:**
- Modify: `frontend/src/app/shared/layout/app-shell/app-shell.ts`
- Modify: `frontend/src/app/shared/layout/app-shell/app-shell.html`
- Modify: `frontend/src/app/shared/layout/app-shell/app-shell.spec.ts`

**Interfaces:**
- Consumes: nothing new (`lucideBus` is already registered app-wide per prior verification).

- [ ] **Step 1: Write the failing test**

Add to `app-shell.spec.ts`, inside the existing `'renders traveler nav items'` test (or as a new test):
```ts
it('renders the Bus Booking nav entry for the traveler role', async () => {
  await configureWithRole('traveler');
  const fixture = TestBed.createComponent(AppShell);
  fixture.detectChanges();
  await fixture.whenStable();
  expect((fixture.nativeElement as HTMLElement).textContent).toContain('Bus Booking');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --include src/app/shared/layout/app-shell/app-shell.spec.ts --watch=false
```
Expected: FAIL — no "Bus Booking" text in the rendered nav yet.

- [ ] **Step 3: Add the nav entry**

In `app-shell.ts`, locate the `NAV_MAP.traveler` array (immediately after the "My Trips" entry) and insert:
```ts
{ to: '/bus-booking', label: 'Bus Booking', icon: 'lucideBus' },
```

- [ ] **Step 4: Add the "New Booking" CTA**

In `app-shell.html`, locate the existing hardcoded "New Trip" button (`<a hlmBtn size="sm" class="gap-1.5" routerLink="/trips/new">...`) and add a sibling button immediately after it, following the identical pattern:
```html
<a hlmBtn size="sm" variant="outline" class="gap-1.5" routerLink="/bus-booking/new">
  <ng-icon name="lucidePlus" class="h-4 w-4" />
  New Booking
</a>
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx ng test --include src/app/shared/layout/app-shell/app-shell.spec.ts --watch=false
```
Expected: PASS, all specs in this file.

- [ ] **Step 6: Inspect changes (read-only)**

```bash
git status
git diff --stat
```

---

### Task 23: Extract `bus-search-form`/`seat-grid` usage into `trip-travel-tab` and remove Trip-only assumptions

**Files:**
- Modify: `frontend/src/app/features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab.ts`
- Modify: `frontend/src/app/features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab.html`
- Modify: `frontend/src/app/features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab.spec.ts`

**Interfaces:**
- Consumes: `BookingFlow` (Task 11, embedded with `[tripId]` bound), `BookingService.getTripBusBookings`/`removeBookingFromTrip` (Task 5).
- Produces: a slimmed `TripTravelTab` that only handles trip-specific wiring (destination resolution, the Bus Bookings summary, owner-only detach) and delegates all search/seat/passenger/payment/booking logic to the shared `BookingFlow`.

- [ ] **Step 1: Write the failing tests**

Replace the existing `trip-travel-tab.spec.ts` content (from Task 6) with:
```ts
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TripTravelTab } from '@app/features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { Trip, TripMember } from '@app/features/trips/services/trip.models';

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
  { tripMemberId: 'm1', userId: 'u2', name: 'Bob', email: 'bob@travelease.test', memberStatus: 'ACCEPTED', joinedDate: '2026-06-02T00:00:00Z', budgetAmount: 0, spentAmount: 0 },
];

const BOOKING = {
  bookingId: 10,
  bookingReference: 'BK10',
  status: 'CONFIRMED',
  totalFare: 1800,
  scheduleId: 1,
  travelDate: '2026-07-12',
  source: 'Bengaluru',
  destination: 'Goa',
  bookedByUserId: 'u1',
  travelerTripId: 't1',
};

async function render(bookings = [BOOKING]) {
  await TestBed.configureTestingModule({
    imports: [TripTravelTab],
    providers: [
      {
        provide: BookingService,
        useValue: {
          getTripBusBookings: () => of({ tripId: 't1', bookingCount: bookings.length, totalFare: 1800, bookings }),
          removeBookingFromTrip: vi.fn(() => of(undefined)),
        },
      },
      {
        provide: DestinationsService,
        useValue: { listDestinations: () => of([{ destinationId: 2, destinationName: 'Goa', state: 'Goa', country: 'India', description: '' }]) },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(TripTravelTab);
  fixture.componentRef.setInput('trip', TRIP);
  fixture.componentRef.setInput('members', MEMBERS);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('TripTravelTab', () => {
  it('embeds the shared BookingFlow with the current trip id bound', async () => {
    const fixture = await render();
    const flowEl = (fixture.nativeElement as HTMLElement).querySelector('app-booking-flow');
    expect(flowEl).toBeTruthy();
  });

  it('shows Detach only on the current-user-owned row (organizer is u1, booking bookedByUserId is u1)', async () => {
    const fixture = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('BK10');
    expect(text).toContain('Detach');
  });

  it('hides Detach on a row booked by a different trip member', async () => {
    const fixture = await render([{ ...BOOKING, bookedByUserId: 'u2' }]);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('BK10');
    expect(text).not.toContain('Detach');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx ng test --include src/app/features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab.spec.ts --watch=false
```
Expected: FAIL — `app-booking-flow` is not embedded yet, and the current component has no owner-only detach logic.

- [ ] **Step 3: Rewrite `trip-travel-tab.ts`**

```ts
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { BookingFlow } from '@app/features/bus-booking/components/booking-flow/booking-flow';
import { BookingService } from '@app/features/bus-booking/services/booking.service';
import { TripBusBooking } from '@app/features/bus-booking/services/booking.models';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { Trip, TripMember } from '@app/features/trips/services/trip.models';
import { AuthService } from '@app/core/auth/auth.service';
import { ToastService } from '@app/shared/ui/toast/toast.service';

@Component({
  selector: 'app-trip-travel-tab',
  imports: [HlmCardImports, HlmButtonImports, BookingFlow],
  templateUrl: './trip-travel-tab.html',
})
export class TripTravelTab implements OnInit {
  public readonly trip = input.required<Trip>();
  public readonly members = input.required<TripMember[]>();

  private readonly bookingService = inject(BookingService);
  private readonly destinationsService = inject(DestinationsService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected readonly destinationName = signal('');
  protected readonly tripBookings = signal<TripBusBooking[]>([]);

  ngOnInit(): void {
    const trip = this.trip();
    this.destinationsService.listDestinations().subscribe((destinations) => {
      const match = destinations.find((d) => d.destinationId === trip.destinationId);
      this.destinationName.set(match?.destinationName ?? '');
    });
    this.loadTripBookings(trip.tripId);
  }

  private loadTripBookings(tripId: string): void {
    this.bookingService.getTripBusBookings(tripId).subscribe({
      next: (summary) => this.tripBookings.set(summary.bookings),
      error: () => {},
    });
  }

  protected bookedByName(booking: TripBusBooking): string {
    const trip = this.trip();
    if (booking.bookedByUserId === trip.organizer.userId) return trip.organizer.name;
    const member = this.members().find((m) => m.userId === booking.bookedByUserId);
    return member?.name ?? 'Trip member';
  }

  protected canDetach(booking: TripBusBooking): boolean {
    return booking.bookedByUserId === this.authService.currentUser()?.userId;
  }

  protected detach(booking: TripBusBooking): void {
    this.bookingService.removeBookingFromTrip(this.trip().tripId, booking.bookingId).subscribe({
      next: () => {
        this.toastService.showSuccess('Booking detached from trip.');
        this.loadTripBookings(this.trip().tripId);
      },
      error: () => this.toastService.showError('Failed to detach booking.'),
    });
  }
}
```

- [ ] **Step 4: Rewrite `trip-travel-tab.html`**

```html
<app-booking-flow [tripId]="trip().tripId" />

@if (tripBookings().length > 0) {
  <div class="mt-6 space-y-3">
    <h3 class="font-semibold text-sm text-muted-foreground">Bus Bookings for this trip</h3>
    @for (b of tripBookings(); track b.bookingId) {
      <div hlmCard>
        <div hlmCardContent class="pt-5 flex items-center justify-between gap-4">
          <div>
            <p class="font-medium">{{ b.bookingReference }}</p>
            <p class="text-xs text-muted-foreground">{{ b.source }} → {{ b.destination }} · {{ b.travelDate }}</p>
            <p class="text-xs text-muted-foreground">Booked by {{ bookedByName(b) }}</p>
          </div>
          <div class="text-right space-y-1">
            <p class="font-semibold">₹{{ b.totalFare }}</p>
            <p class="text-xs text-muted-foreground">{{ b.status }}</p>
            @if (canDetach(b)) {
              <button hlmBtn variant="outline" size="sm" (click)="detach(b)">Detach</button>
            }
          </div>
        </div>
      </div>
    }
  </div>
}
```

Note: this removes the member-count seat cap, hardcoded passenger age/gender, and forced immediate `attachBookingToTrip` call entirely — that logic no longer exists in this file at all, since `BookingFlow` now owns the whole search/seat/passenger/booking/attach lifecycle.

- [ ] **Step 5: Confirm `AuthService.currentUser()` shape used above matches its real definition**

Run:
```bash
grep -n "currentUser" frontend/src/app/core/auth/auth.service.ts
```
Expected: confirms the signal's return type includes a `userId` field matching what `canDetach` compares against. If the field is named differently, use the actual name here instead — do not guess.

- [ ] **Step 6: Run test to verify it passes**

```bash
npx ng test --include src/app/features/trips/components/trip-detail/tabs/trip-travel-tab/trip-travel-tab.spec.ts --watch=false
```
Expected: PASS, 3 specs.

- [ ] **Step 7: Inspect changes (read-only)**

```bash
git status
git diff --stat
```

---

### Task 24: Full build validation and full test suite run

**Files:** none (verification-only task)

- [ ] **Step 1: Run the complete frontend test suite**

```bash
npx ng test --watch=false
```
Expected: all specs pass, including every new spec file from Tasks 1–23 and every pre-existing spec (no regressions).

- [ ] **Step 2: Run a production build**

```bash
npx ng build
```
Expected: build succeeds with no TypeScript errors, no unresolved lazy-import paths, no unused-import lint failures.

- [ ] **Step 3: Start the backend and frontend dev servers for live verification**

Run the backend (from `travelease-fullstack/backend/`):
```bash
./mvnw spring-boot:run
```
Run the frontend (from `travelease-fullstack/frontend/`, in a separate terminal):
```bash
npx ng serve
```
Expected: both start without errors; frontend reachable at its dev URL, backend reachable at its configured port.

- [ ] **Step 4: Inspect changes (read-only)**

```bash
git status
git diff --stat
```
Expected: the complete, final diff for the whole feature. Do not stage or commit — this is the terminal read-only checkpoint of the entire plan.

---

### Task 25: Live frontend–backend workflow matrix (manual verification deliverable)

**Files:**
- Create: `travelease-fullstack/docs/superpowers/specs/2026-07-09-traveler-bus-booking-verification-matrix.md`

With both servers running from Task 24, log in as a real ROLE_TRAVELER test account and manually exercise each row, recording pass/fail and any notes:

- [ ] **Step 1: Write the matrix template and fill it in as each flow is exercised**

```markdown
# Traveler Bus Booking — Live Verification Matrix

| # | Flow | Steps | Expected | Result |
|---|---|---|---|---|
| 1 | Standalone search | Nav → Bus Booking → New Booking → search a real route/date | Real schedules returned from `GET /api/schedules/search` | |
| 2 | Seat lock success | Select an available seat | `POST /api/seats/lock` succeeds, countdown appears | |
| 3 | Seat lock conflict | Lock the same seat from two browser sessions as two different travelers | Second attempt gets a 409 toast, grid refreshes, no false success | |
| 4 | Fare preview | Select seats, view fare summary | Real `POST /api/fares/calculate` breakdown shown, including any coupon fields | |
| 5 | LADIES seat gender lock | Select a LADIES-type seat | Gender field locked to Female with explanatory copy | |
| 6 | Booking submission | Complete passenger details, confirm & pay | `POST /api/bookings` succeeds, booking reaches CONFIRMED | |
| 7 | Standalone confirmation | Observe confirmation screen after step 6 | No "Attach to this Trip" or "Back to Trip" shown | |
| 8 | Ticket display | Click View Ticket | Real `GET /api/bookings/{id}/ticket` data + QR renders | |
| 9 | Ticket verification (public) | Log out, visit `/verify-ticket`, enter the ticket number from step 8 | Ticket found and displayed while logged out | |
| 10 | My Bookings list | Nav → Bus Booking | The booking from step 6 appears with correct route/fare/status | |
| 11 | Booking detail | Open the booking from step 10 | Detail + timeline render; no Trip-attachment UI present | |
| 12 | Modify booking | Edit a passenger's contact info | `PUT /api/bookings/modify` succeeds, change reflected on reload | |
| 13 | Cancellation preview vs actual | Open Cancel Booking dialog, note the "Estimated" figures, confirm cancellation | Actual `CancellationResponse` figures may differ from the estimate; UI clearly distinguishes them | |
| 14 | Partial cancellation block | On a multi-seat CONFIRMED booking, select every seat in the partial-cancel dialog | Confirm button disabled, exact message "To cancel all seats, use Cancel Booking." shown | |
| 15 | Refund visibility | After cancelling, reopen booking detail | Refund block appears, fetched via `GET /api/refunds?bookingId=` | |
| 16 | Trip-context booking | From a real Trip's Bus Bookings tab, book a new bus via the embedded flow | Confirmation shows "Attach to this Trip?" and "Back to Trip" | |
| 17 | Attach acceptance | Click Attach to this Trip | `POST /api/trips/{tripId}/bus-bookings` succeeds | |
| 18 | Trip tab detach visibility | View the Trip's Bus Bookings tab as the booking owner vs. as a different accepted member | Detach button shown only to the owner | |
| 19 | Trip lifecycle gate | Mark the Trip COMPLETED (or use one already COMPLETED) and revisit its Bus Bookings tab | Attach/Detach controls are hidden entirely, for every viewer | |
| 20 | Nav/routing | Confirm the "Bus Booking" nav entry and "New Booking" CTA both navigate correctly | Both land on the expected routes | |
```

- [ ] **Step 2: Inspect the final matrix file (read-only)**

```bash
git status
```
Expected: one new untracked file recording the live verification results. Do not stage or commit.

---

## Plan Self-Review

**1. Spec coverage** — every spec section (A–H) maps to at least one task:
- Section A (audit/classification) → Task 6/23 (migration + refactor of `trip-travel-tab`, the only pre-existing piece).
- Section B (workflow/endpoints) → Tasks 4, 5, 11 (every endpoint from the spec's workflow list is called by a real service method).
- Section C (authorization model) → enforced entirely server-side already; the frontend's job is to not fight it — reflected in Task 23's owner-only `canDetach` and the deliberate absence of any client-side RBAC-gap workaround.
- Section D (seat/fare/coupon) → Tasks 3, 4, 8, 9 (corrected enums, lock/409 handling, fare/coupon display).
- Section E (booking/passenger/payment/confirmation/ticket) → Tasks 2, 5, 10, 11, 12, 13, 14, 15.
- Section F (My Bookings/cancellation/refund) → Tasks 16, 17, 18, 19, 20.
- Section G (Trip attachment/detachment) → Task 23 (embedded `BookingFlow` + owner-only detach + no Booking Detail attachment UI, confirmed absent in Task 17's test).
- Section H (nav/routing/services/sequencing) → Tasks 21, 22, and the query-param `tripId` handoff verified in Task 12's test.
- The 14-point self-review items from the spec (no fake payment/ticket-download/mock-data, "Estimated" cancellation labeling, etc.) → reflected directly in Tasks 13 (no Download button asserted), 18 ("Estimated" label asserted), and the complete absence of any `mock-data.ts` import anywhere in this plan.

**2. Placeholder scan** — searched every task for "TBD"/"TODO"/"handle appropriately": none found. Task 21's route-ordering note and Task 23's Step 5 (`grep` to confirm `AuthService.currentUser()`'s real field name before trusting it) are intentional "verify against real source before finalizing" steps, not placeholders — they contain an exact command and an exact expectation.

**3. Type consistency** — cross-checked signatures used across tasks:
- `BookingFlow`'s `tripId` input (Task 11) matches how Task 23 binds it (`[tripId]="trip().tripId"`, a `string`).
- `BookingService.cancelBooking(id, request?)` (Task 5) matches Task 18's call shape exactly (`cancelBooking(this.bookingId(), { bookingId, reason: 'OTHER' })`).
- `PassengerDetailDto.passengerGender`'s type (Task 2: `'FEMALE' | 'MALE' | 'OTHER'`) matches what `passenger-details-form` (Task 10) emits and what the plan's Global Constraints mandate.
- `TripBusBooking.bookedByUserId` (Task 2) matches the field name used in Task 23's `canDetach`/`bookedByName`.
- One gap found and fixed during this review: Task 5's original draft omitted `removeBookingFromTrip` from its own file-level "Produces" list despite Task 23 depending on it — corrected; it is now listed in Task 5's Interfaces block and covered by that task's own test.

No further gaps found.

---

Plan complete and saved to `docs/superpowers/plans/2026-07-09-traveler-bus-booking.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
