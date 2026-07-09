# Contact Support / Complaint Ticket — Design

## Summary

A new "Contact Support" feature lets any logged-in user raise a complaint/support
ticket from a form in their dashboard. The form's category dropdown lets the user
say which part of the app the complaint is about (Bus, Hotel, Activity, Trip,
Other). Tickets land in a single admin-facing queue that admins filter by
category, matching the modules that already exist in the app. Admins can update
ticket status and reply; the user can track status and read replies from their
own "My Tickets" view.

This is a net-new module — no existing ticket/complaint/support infrastructure
was found in the codebase.

## Scope (v1)

In scope:
- User raises a ticket: category, subject, free-text description.
- User views their own tickets and each ticket's status + admin reply thread
  (read-only on the user side).
- Admin views all tickets in one place, filterable by category and status.
- Admin updates ticket status and posts replies (one-way: admin → user).

Explicitly out of scope for v1 (can be added later without reworking this
design):
- Linking a ticket to a specific booking (e.g. a particular bus/hotel booking).
- File/screenshot attachments.
- Priority field.
- Email notifications on reply/status change.
- Two-way chat (user replying back in the thread).
- Per-provider routing (ROLE_PROVIDER / ROLE_HOTEL_PROVIDER / ROLE_ACTIVITY_PROVIDER)
  — tickets always go to ROLE_ADMIN, not to the individual bus/hotel/activity
  provider who owns the booking.

## Architecture

Follows the existing per-module layered convention used throughout the backend
(see `accommodation`, `busbooking`) and the existing per-vertical frontend
feature-folder convention (see `hotel`, `transport`, `activity`).

### Backend — `backend/src/main/java/com/travelease/backend/support/`

```
support/
  controller/
    SupportTicketController.java       (user-facing: create, list own, get own detail)
    AdminSupportTicketController.java  (admin-facing: list all/by category, update status, reply)
  dto/
    CreateTicketRequest.java
    TicketResponse.java
    TicketDetailResponse.java
    ReplyRequest.java
    ReplyResponse.java
    UpdateTicketStatusRequest.java
  entity/
    SupportTicket.java
    SupportTicketReply.java
  repository/
    SupportTicketRepository.java
    SupportTicketReplyRepository.java
  service/
    SupportTicketService.java (interface)
    SupportTicketServiceImpl.java
```

Auth follows existing convention:
- User endpoints resolve the caller via the injected `Authentication` principal
  → email (JWT subject, per `UserDetailsServiceImpl`) → `User` lookup via
  `UserRepository.findByEmail(...)`.
- Admin endpoints are gated with `@PreAuthorize("hasRole('ADMIN')")` at the
  controller class level, same as `busbooking/controller/AdminController.java`.

### Frontend — `frontend/src/app/features/support/`

```
support/
  components/
    raise-ticket-form/       (user: category dropdown + subject + description)
    my-tickets/               (user: list of own tickets w/ status)
    ticket-detail/            (user: view thread, read-only)
  services/
    support-ticket.service.ts
    support-ticket.models.ts
```

Plus one new component under the existing admin area,
`frontend/src/app/features/admin/components/admin-support-tickets/`, added as a
sibling to `admin-buses` / `admin-hotels` and wired into the same admin
dashboard nav/routing those use today.

The "Contact Support" entry point is reachable from the user dashboard
(`frontend/src/app/features/dashboard/`), linking to the raise-ticket form and
the "My Tickets" list.

## Data Model

### `SupportTicket`

| Field | Type | Notes |
|---|---|---|
| id | Long | PK |
| user | `User` (FK) | who raised it |
| category | enum `TicketCategory` { BUS, HOTEL, ACTIVITY, TRIP, OTHER } | drives admin filtering; matches the app's existing verticals (bus = `busbooking`, hotel = `accommodation`, activity = `itinerary`), plus TRIP for general trip-planning issues and OTHER as catch-all |
| subject | String | short title |
| description | String (text) | free-text complaint body |
| status | enum `TicketStatus` { OPEN, IN_PROGRESS, RESOLVED, CLOSED } | defaults to OPEN on create |
| createdAt | Instant | set on create |
| updatedAt | Instant | bumped on status change or new reply |

### `SupportTicketReply`

| Field | Type | Notes |
|---|---|---|
| id | Long | PK |
| ticket | `SupportTicket` (FK) | parent |
| message | String (text) | admin's reply text |
| createdAt | Instant | set on create |

Replies are one-way (admin → user only), so `SupportTicketReply` does not need
an author/sender field — every reply is implicitly from an admin. If two-way
chat is added later, that's the field to introduce then.

`status` transitions are admin-only and unconstrained (any status → any
status) — no formal state machine, consistent with how booking statuses are
handled elsewhere in this codebase.

Schema is created via Hibernate `ddl-auto=update`, consistent with the rest of
the app (no Flyway/Liquibase in this repo).

## API Endpoints

### User-facing — `SupportTicketController`, base `/api/support/tickets`, any authenticated user

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/support/tickets` | Create a ticket (`category`, `subject`, `description`) → `TicketResponse` |
| GET | `/api/support/tickets` | List the caller's own tickets, newest first |
| GET | `/api/support/tickets/{id}` | Get one of the caller's own tickets with its reply thread |

Ownership check on the get-by-id route: compare `ticket.getUser().getId()`
against the resolved `Authentication` principal's user id; a mismatch returns
404 (not 403), to avoid confirming that a ticket ID exists when it isn't the
caller's.

### Admin-facing — `AdminSupportTicketController`, base `/api/admin/support/tickets`, `@PreAuthorize("hasRole('ADMIN')")`

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/support/tickets?category=BUS&status=OPEN` | List all tickets, with optional `category`/`status` filters |
| GET | `/api/admin/support/tickets/{id}` | Get any ticket with its full reply thread |
| POST | `/api/admin/support/tickets/{id}/replies` | Add a reply; also bumps `updatedAt` |
| PATCH | `/api/admin/support/tickets/{id}/status` | Update status only |

## Frontend UX

### User side

- **Raise Ticket form**, reachable from the user dashboard ("Contact Support"):
  a `<select>` for Category (Bus / Hotel / Activity / Trip / Other), a subject
  input, a description textarea, and a Submit button. Follows the existing
  form convention (see `login.ts` / `login.html`): standalone component,
  template reference variables read in `(submit)`, signals for
  `submitting`/`error`/`success` state — no Reactive Forms or template-driven
  forms module, matching the rest of the codebase. Uses the existing hlm/Spartan
  UI components (`HlmInputImports`, `HlmButtonImports`, etc.).
- **My Tickets**: list of the user's own tickets (subject, category badge,
  status badge, created date), newest first. Clicking a row opens **Ticket
  Detail**: description plus the admin reply thread underneath, read-only
  (no compose box on this side, per the one-way reply decision).

### Admin side

- **`admin-support-tickets`**, a new sibling section to `admin-buses` /
  `admin-hotels` in the admin dashboard nav.
- Table of all tickets: subject, user, category, status, created date.
  Category filter (All / Bus / Hotel / Activity / Trip / Other) and a status
  filter.
- Clicking a row opens a detail panel: description, existing replies, a
  status `<select>` to update (Open / In Progress / Resolved / Closed), and a
  textarea + "Reply" button to post a new reply.

### Error handling

Standard toast/error-signal pattern already used in `login.ts` (an `error`
signal shown inline) for create/reply/status-update failures. A 404 on ticket
detail (not found, or not owned by the caller) renders a simple "Ticket not
found" state rather than a raw error.

## Testing Approach

- **Backend**: unit tests for `SupportTicketServiceImpl` covering create,
  list-own, the ownership check on get-by-id, admin category/status
  filtering, reply creation, and status update — following the existing
  `*ServiceImpl` test pattern (e.g. `AccommodationServiceImplTest`).
  Controller-level tests cover the ownership 404 behavior and the
  `@PreAuthorize` admin gating on `AdminSupportTicketController`.
- **Frontend**: component specs for `raise-ticket-form` (submit happy path
  and validation/error state), `my-tickets` (renders list, empty state), and
  `admin-support-tickets` (filter behavior, reply submit, status update) —
  mirroring the existing `.spec.ts` pattern used alongside components like
  `trip-detail.spec.ts`.
