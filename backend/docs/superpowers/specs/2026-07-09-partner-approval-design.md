# Partner Approval Workflow — Design

## Context

TravelEase currently has two ways users get created:

- Public self-registration (`POST /api/auth/register`) — always creates a `ROLE_TRAVELER`
  account, immediately usable.
- Admin-created accounts (`POST /api/admin/users`, added alongside the admin dashboard) — admin
  picks any role including the three provider roles (`ROLE_PROVIDER`, `ROLE_HOTEL_PROVIDER`,
  `ROLE_ACTIVITY_PROVIDER`) and the account is immediately usable.

There is no concept of a partner (provider) applying for an account and needing admin approval
before they can operate — `User` has no status field, and `AdminController` (`/api/admin`) is an
empty stub. Two existing frontend pages are adjacent but not it:
`admin-partners` is a static ranking table fed from mock data (`@app/core/mock-data`), unrelated
to approvals. `admin-approvals` (routed at `/admin/approvals`) already has the right shape for
this feature — Pending/Hotel/Transport/Activity stat cards and an Approve/Reject list — but it's
entirely fed from the `pendingApprovals` mock array and its Approve/Reject buttons have no click
handlers at all.

This spec adds a self-service partner registration flow that starts an account in `PENDING`
state, blocks login until an admin approves it, and gives admins a queue to approve/reject
pending applications.

## Decisions

### Data model

- New `ApprovalStatus` enum: `PENDING`, `APPROVED`, `REJECTED`.
- New `status` column on `User` (`auth/entity/User.java`), non-null.
- Existing creation paths (`UserServiceImpl.register`, `UserServiceImpl.createByAdmin`) set
  `status = APPROVED` — no behavior change for travelers or admin-created accounts.
- `providerId` is untouched by this feature — it's already `null` for admin-created providers
  today, so provider dashboards already tolerate an unset `providerId`.

### Backend endpoints

- `POST /api/auth/register/partner` (public, new) — same fields as `RegisterRequest`
  (name/email/phone/password/securityQuestion/securityAnswer) plus a `role` field restricted to
  `PROVIDER`, `HOTEL_PROVIDER`, `ACTIVITY_PROVIDER` (reuses the `mapRole` validation already in
  `UserServiceImpl`, rejecting `ADMIN`/`TRAVELER` for this endpoint). Creates the user with
  `status = PENDING`.
- `POST /api/auth/login` (`AuthServiceImpl.login`) — after password match succeeds, check
  `user.getStatus()`:
  - `PENDING` → throw `AccountNotApprovedException("Your partner account is awaiting admin approval")`
  - `REJECTED` → throw `AccountNotApprovedException("Your partner application was rejected")`
  - `APPROVED` → proceed as today.
- `GET /api/admin/partners/pending` (`hasRole('ADMIN')`, new) — returns users with a provider
  role and `status = PENDING`, same `UserResponse` shape used by `/api/admin/users`.
- `PUT /api/admin/partners/{id}/approve` (`hasRole('ADMIN')`, new) — sets `status = APPROVED`.
  404 if the user doesn't exist; 400 (`InvalidRequestException`) if the user isn't a
  provider-role account in `PENDING` status.
- `PUT /api/admin/partners/{id}/reject` (`hasRole('ADMIN')`, new) — sets `status = REJECTED`,
  same validation as approve. The record is kept (not deleted) so admins retain an audit trail
  and rejected users show up distinctly from pending ones.

### Error handling

- New `AccountNotApprovedException` (extends `RuntimeException`) + a `GlobalExceptionHandler`
  entry mapping it to `403` with error code `ACCOUNT_NOT_APPROVED`, following the existing
  pattern used for `InvalidCredentialsException` etc.
- Duplicate email and field validation on partner registration reuse the existing
  `DuplicateResourceException` (409) and `MethodArgumentNotValidException` (400) handling — no
  new logic needed.
- Approve/reject on a missing id reuses `ResourceNotFoundException` (404); approve/reject on a
  non-pending or non-provider user reuses `InvalidRequestException` (400,
  `"User is not a pending partner application"`).

### Frontend

- New public partner sign-up page/route mirroring the existing traveler `register` component,
  with a role picker for the three provider types, posting to `/api/auth/register/partner`. On
  success it shows "Your application is pending admin approval" instead of auto-login (no token
  is issued by this endpoint).
- Login page surfaces the new 403 message from `ACCOUNT_NOT_APPROVED` as the inline error, same
  place the existing invalid-credentials error is shown.
- `admin-approvals.ts`/`.html` (already routed at `/admin/approvals`, no route change needed) is
  rewired from the `pendingApprovals` mock array to `GET /api/admin/partners/pending`. The
  `type`/icon mapping (`Hotel`/`Transport`/`Activity` → `lucideHotel`/`lucideBus`/`lucideActivity`,
  via the existing `iconForApprovalType`) is kept, driven off the user's role
  (`ROLE_HOTEL_PROVIDER`/`ROLE_PROVIDER`/`ROLE_ACTIVITY_PROVIDER`). The mock `city` and
  `documents` fields are dropped (out of scope — see below); `registered` is populated from the
  user's `createdAt`. Approve/Reject buttons get click handlers calling the corresponding `PUT`
  endpoint and removing the row (or refetching) on success.
- Data fetching follows the pattern already used by `hotels`/`tripBookings` in
  `trip-accommodation-tab.ts` and the now-fixed `admin-users.ts`: a `signal<PendingPartner[]>([])`
  updated via `.set(...)`, not a plain mutated array — this app is zoneless (no `zone.js`
  dependency), so plain-array mutation doesn't trigger re-render.
- `admin-partners` (the ranking table) is untouched — it remains a separate analytics view.

## Testing

- Backend: extend `AuthFlowIntegrationTest` with a scenario covering
  register-partner → login blocked (`PENDING`) → admin approve → login succeeds, and a second
  scenario for admin reject → login blocked (`REJECTED`). Unit tests in `UserServiceImplTest` for
  the new service methods (list pending, approve, reject, and their error cases).
- Frontend: extend `admin-partners.spec.ts` for the pending tab's fetch/approve/reject calls,
  mirroring the fetch-and-render assertions already in `admin-users.spec.ts`.

## Out of scope

- Business profile fields (business name, address, registration/GST number) at signup — the
  partner registration form is basic-account-only; any additional business setup happens after
  approval through the existing provider dashboards.
- Populating `providerId` on approval — out of scope; it's a pre-existing gap (admin-created
  providers already get `providerId = null`) not introduced or fixed by this feature.
- Email/SMS notifications on approval or rejection.
