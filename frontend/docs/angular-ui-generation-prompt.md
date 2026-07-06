# TravelEase Angular UI Generation Prompt

Use this prompt to build the TravelEase frontend in the existing `frontend/` Angular project.

## Role

You are a senior Angular engineer and product-minded UI designer. Build a polished Angular UI for TravelEase using the existing frontend scaffold, the backend conventions, the implemented backend endpoints, and the target route/product structure from the public React/Lovable prototype:

- Traveler: `https://trip-weaver-83.lovable.app/`, `/dashboard`, `/trips`, `/invitations`, `/notifications`
- Admin: `/admin`, `/admin/route-analytics`, `/admin/funnel`, `/admin/users`, `/admin/trips`, `/admin/buses`, `/admin/hotels`, `/admin/reports`, `/admin/partners`
- Hotel provider: `/hotel`, `/hotel/properties`, `/hotel/rooms`, `/hotel/bookings`, `/hotel/reviews`, `/hotel/reports`
- Transport provider: `/transport`, `/transport/vehicles`, `/transport/routes`, `/transport/bookings`, `/transport/reports`
- Activity provider: `/activity`, `/activity/activities`, `/activity/bookings`, `/activity/capacity`, `/activity/reports`

If the Lovable app is unavailable, use the route list above as the product map and create a refined TravelEase UI in Angular. Do not copy React code. Implement Angular-native structure, state, routing, components, and services.

## Local Project Context

Frontend:

- Path: `frontend/`
- angular-cli 22.0.4 and node.js 26.2.0 and npm 11.12.0
- Angular 21 standalone app with SSR.
- Tailwind v4 is configured in `src/styles.css`.
- spartan-ng has already been initialized with `components.json`.
- Existing component import alias: `@spartan-ng/helm/*`.
- Existing generated UI libraries include button, input, field, card, badge, dialog, dropdown-menu, sidebar, sheet, select, checkbox, switch, date-picker, calendar, autocomplete, popover, separator, skeleton, empty, textarea, tooltip, input-group, and collapsible.
- `@ng-icons/core` and `@ng-icons/lucide` are installed. Use Lucide icons through Angular icon components.
- Current `app.routes.ts` is empty and `app.html` still contains Angular placeholder content. Replace the placeholder with the real app shell and routed pages.

Backend:

- Path: `backend/`
- Java 17, Spring Boot 3.5.16, Spring Security JWT, Spring Data JPA, H2.
- Read and follow:
  - `backend/CLAUDE.md`
  - `backend/AGENTS.md`
  - `backend/docs/coding_guidelines.md`
  - `backend/docs/architecture.md`
  - `backend/docs/api_contract.md`
- Backend package style is feature-based, but this task is frontend only.
- All backend success responses use:

```json
{
  "success": true,
  "data": {},
  "message": "string",
  "timestamp": "2026-06-28T14:32:00Z"
}
```

- Backend error responses use:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "string",
    "details": []
  },
  "timestamp": "2026-06-28T14:32:00Z"
}
```

Frontend HTTP services must unwrap this envelope consistently and surface `error.message` and field-level `details` in forms.

## Current Backend Implementation Status

Only these backend areas are implemented right now:

- Authentication
- Budget
- Expense
- Settlement

Use real HTTP services for implemented endpoints. For all other modules, create typed dummy services with mock data and TODO comments that name the intended backend endpoint. Keep the dummy services behind the same interface style as real services so they can be swapped later.

## Implemented Endpoints To Use Now

Authentication:

- `POST /api/auth/register`
  - Body: `{ name, email, phone, password }`
  - Password rule: at least 8 chars, at least one letter, at least one digit.
- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Response data: `{ accessToken, user }`
- `GET /api/auth/me`
  - Requires bearer token.

Important auth implementation note:

- The user story requests httpOnly cookies, but the current backend returns `accessToken` in the response body and expects `Authorization: Bearer <token>`.
- Implement the frontend with a single `AuthTokenStore` abstraction. For now it can store the token in memory/session storage, but mark it clearly so it can switch to httpOnly cookie auth when the backend supports it.
- Do not scatter `localStorage` access through components.

Expense:

- `POST /api/trips/{tripId}/expenses`
- `GET /api/trips/{tripId}/expenses`
- `GET /api/trips/{tripId}/expenses/{expenseId}`
- Create body:

```ts
{
  amount: number;
  category: string;
  description: string;
  expenseDate?: string;
  payerId: string;
  participantIds: string[];
  participantShares?: { userId: string; shareAmount: number }[];
}
```

Budget:

- `GET /api/trips/{tripId}/budget/me`
- `GET /api/trips/{tripId}/budget/summary`

Settlement:

- `GET /api/trips/{tripId}/settlements/me`
- `GET /api/trips/{tripId}/settlements/summary`
- `PATCH /api/settlements/{settlementId}/paid`

## Future/Dummy Endpoint Map

Create typed dummy services for these until the backend exists:

- Trips: `POST /api/trips`, `GET /api/trips/{tripId}`, `PUT /api/trips/{tripId}`, `PATCH /api/trips/{tripId}/cancel`, `PUT /api/trips/{tripId}/category`, `GET /api/traveler-categories`
- Invitations: `POST /api/invitations`, `POST /api/invitations/bulk`, `PATCH /api/invitations/{id}/accept`, `PATCH /api/invitations/{id}/reject`
- Notifications: `GET /api/notifications`, `PATCH /api/notifications/{id}/read`, `GET /api/notifications/departure-suggestions`
- Hotels: `GET /api/hotels/search`, `GET /api/hotels/filter`, `POST /api/hotel-bookings`, `POST /api/hotel-bookings/{id}/allocate-room`
- Transport: `GET /api/transports/search`, `POST /api/transport-bookings`, `POST /api/transport-bookings/{id}/allocate-seats`
- Recommendations: `GET /api/recommendations/{tripId}`
- Itineraries: `POST /api/itineraries`, `POST /api/itineraries/{id}/activities`, `PUT /api/itineraries/{id}`, `DELETE /api/itineraries/{id}/activities/{activityId}`, `PATCH /api/itineraries/{id}/activities/{activityId}/complete`
- Delays: `POST /api/delays`, `GET /api/delays/{id}/impact-analysis`, `GET /api/delays/{id}/reschedule-suggestions`, `POST /api/delays/{id}/accept-suggestion`
- Admin catalog/user management: users, trips, buses/transports, hotels, partners, reports, approvals, destinations, attractions, activities
- Provider modules: hotel properties/rooms/bookings/reviews/reports, transport vehicles/routes/bookings/reports, activity activities/bookings/capacity/reports

## Required User Stories Coverage

Build navigation, screens, forms, tables, empty states, loading states, and dummy-backed workflows for:

- US-AUTH-01 registration
- US-AUTH-02 login
- US-AUTH-03 logout
- US-AUTH-04 profile management
- US-ADMIN-01 hotels and destinations
- US-ADMIN-02 transport services
- US-ADMIN-03 attractions
- US-ADMIN-04 activities
- US-ADMIN-05 users
- US-TRIP-01 create trip
- US-TRIP-02 traveler category
- US-TRIP-03 modify trip
- US-TRIP-04 cancel trip
- US-INV-01 invite travelers
- US-INV-02 accept invitation
- US-INV-03 reject invitation
- US-HOTEL-01 search hotels
- US-HOTEL-02 filter hotels
- US-HOTEL-03 book hotel
- US-HOTEL-04 smart room allocation UI
- US-TRANS-01 search transport
- US-TRANS-02 book transport
- US-TRANS-03 smart seat allocation UI
- US-REC-01 personalized recommendations
- US-ITI-01 create itinerary
- US-ITI-02 modify itinerary
- US-ITI-03 mark activity completed
- US-BUD-01 record shared expense
- US-BUD-02 monitor budget usage
- US-SET-01 settlement management
- US-NOTIF-01 activity reminders
- US-NOTIF-02 departure suggestions
- US-DELAY-01 report delay
- US-DELAY-02 analyze delay impact
- US-DELAY-03 rescheduling suggestions

## Route Structure

Implement these Angular routes with lazy-loaded standalone components:

Auth:

- `/login`
- `/register`

Traveler:

- `/`
- `/dashboard`
- `/trips`
- `/trips/new`
- `/trips/:tripId`
- `/trips/:tripId/expenses`
- `/trips/:tripId/budget`
- `/trips/:tripId/settlements`
- `/trips/:tripId/itinerary`
- `/trips/:tripId/recommendations`
- `/trips/:tripId/delays`
- `/expenses`
- `/profile`
- `/notifications`
- `/invitations`

Admin:

- `/admin`
- `/admin/route-analytics`
- `/admin/funnel`
- `/admin/users`
- `/admin/trips`
- `/admin/buses`
- `/admin/hotels`
- `/admin/reports`
- `/admin/partners`
- `/admin/approvals`

Hotel provider:

- `/hotel`
- `/hotel/properties`
- `/hotel/rooms`
- `/hotel/bookings`
- `/hotel/reviews`
- `/hotel/reports`

Transport provider:

- `/transport`
- `/transport/vehicles`
- `/transport/routes`
- `/transport/bookings`
- `/transport/reports`

Activity provider:

- `/activity`
- `/activity/activities`
- `/activity/bookings`
- `/activity/capacity`
- `/activity/reports`

Also add a polished `**` not-found route.

## App Shells And Navigation

Create role-aware layouts:

- Auth layout for login/register.
- Traveler shell with sidebar and top bar.
- Admin shell with sidebar and top bar.
- Hotel provider shell.
- Transport provider shell.
- Activity provider shell.

Sidebar behavior:

- Use spartan-ng sidebar components.
- Use Lucide icons for each nav item.
- Show active route state.
- Support mobile with a sheet/drawer.
- Include logout in the sidebar or user menu.

Top bar behavior:

- Page title and contextual subtitle.
- Search or command-style quick filter where useful.
- Notification button.
- User/role switcher for demo mode if backend roles are not fully available.

## Visual Design Direction

The UI should feel like a modern travel operations product:

- Clean SaaS dashboard with travel-specific warmth.
- Light theme by default, with optional dark mode if easy.
- Use spartan-ng `nova` tokens as the base.
- Avoid a one-color purple/blue gradient look.
- Use restrained color accents: teal/sky for travel, amber for alerts, green for completed/paid, red for destructive/cancelled, slate/neutral for structure.
- Cards should have radius 8px or less unless the existing spartan token forces otherwise.
- Do not put cards inside cards.
- Use tables for admin/provider management.
- Use compact cards for repeated traveler items like trips, invitations, hotel options, transport options, itinerary activities, and settlement rows.
- Use skeletons for loading.
- Use empty states with direct actions.
- Use dialogs/sheets for create/edit flows when it keeps the route focused.
- Text must fit at mobile and desktop widths.
- Build actual useful screens, not landing-page marketing.

Recommended page patterns:

- Traveler dashboard: trip summary, upcoming itinerary, budget snapshot, pending invitations, recommendations, notifications.
- Trips list: filters, status tabs, trip cards/table hybrid, create trip CTA.
- Trip detail: overview tabs for itinerary, expenses, budget, settlements, recommendations, members, delays.
- Admin dashboard: KPI cards, route analytics teaser, approval queue, recent trips/users/providers.
- Provider dashboards: operational KPIs, booking pipeline, inventory health, reports links.

## Frontend Architecture

Prefer this structure:

```text
src/app/
  core/
    api/
      api-response.model.ts
      api-client.service.ts
      auth.interceptor.ts
    auth/
      auth.service.ts
      auth-token-store.ts
      auth.guard.ts
      role.guard.ts
    data/
      mock-data.ts
    models/
      *.model.ts
  layouts/
    auth-layout/
    app-shell/
    role-shell/
  shared/
    components/
    pipes/
    utils/
  features/
    auth/
    traveler/
    trips/
    expenses/
    budget/
    settlements/
    invitations/
    notifications/
    profile/
    admin/
    hotel-provider/
    transport-provider/
    activity-provider/
```

Use Angular standalone components, signals where they simplify state, typed reactive forms, and route-level lazy loading.

## HTTP And Error Handling

- Create one `ApiClientService` around Angular `HttpClient`.
- Create `ApiResponse<T>` and `ApiError` interfaces matching the backend envelope.
- Unwrap `data` in services.
- Throw/display backend errors consistently.
- Add an auth interceptor that attaches `Authorization: Bearer <token>` for authenticated requests.
- Handle `401` by clearing the token and navigating to `/login`.
- Keep base API URL configurable, for example via an injection token or environment file.

## Forms

Use reactive forms with clear validation:

- Register: name, email, phone, password, confirm password.
- Login: email, password.
- Profile: name, phone, password change area.
- Trip create/edit: name, source, destination, start date, end date, traveler category.
- Invite members: emails, support multiple invitees.
- Expense create: amount, category, description, date, payer, participants, equal/custom split.
- Delay report: duration, reason, affected trip/activity.
- Admin/provider CRUD forms: required fields and status controls.

Show validation errors inline and keep submit buttons disabled while invalid or submitting.

## Dummy Data Requirements

Create realistic mock data for:

- Users with roles: traveler, admin, hotel provider, transport provider, activity provider.
- Trips with categories: Solo, Couple, Family, Friends, Corporate.
- Invitations.
- Notifications.
- Hotels, rooms, bookings, reviews.
- Transport vehicles, routes, bookings.
- Activities, capacity slots, bookings.
- Itineraries.
- Expenses, budgets, settlements.
- Delays and reschedule suggestions.
- Admin analytics and reports.

Dummy data should be typed and centralized. Avoid hard-coded arrays scattered across page components.

## Acceptance Criteria

The Angular UI is complete when:

- `npm install` is not required unless dependencies are missing.
- `npm run build` succeeds.
- `npm start` serves the app.
- Every route listed above renders a purposeful page, not a blank placeholder.
- Auth, budget, expense, and settlement screens call the implemented backend endpoints.
- Unimplemented modules use typed dummy services with clear TODO endpoint comments.
- The app uses spartan-ng components and Lucide icons.
- The Angular placeholder page is fully removed.
- The UI is responsive for desktop and mobile.
- Forms have validation and error display.
- Loading, empty, success, and error states exist for real and dummy service pages.
- Navigation is role-aware and visually polished.

## Important Constraints

- Do not implement backend code in this task.
- Do not change backend endpoint paths.
- Do not return raw backend envelopes directly to components; services should provide typed data or typed errors.
- Do not use React patterns or React libraries.
- Do not store auth tokens directly in random components.
- Do not create a marketing landing page as the main experience.
- Keep edits consistent with the existing Angular/spartan-ng setup.
