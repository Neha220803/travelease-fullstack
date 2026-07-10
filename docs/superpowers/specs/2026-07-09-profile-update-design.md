# Profile Update + Change Password — Design

## Goal

The Profile page (`frontend/src/app/features/profile/components/profile/`) currently renders account details as static, non-functional inputs. This work makes it functional: users can edit their name/phone and change their password, backed by real endpoints.

## Scope

In scope:
- Backend endpoint to update `name` and `phone` for the authenticated user.
- Backend endpoint to change the authenticated user's password, gated by their security question answer.
- Frontend: wire up the "Save changes" and "Change password" buttons with client-side validation, following this codebase's existing template-driven form conventions.
- Remove the non-functional "Preferred city" input and "Travel preferences" panel (no backend concept exists for either).

Out of scope:
- Email editing (email is the JWT principal/login identifier; changing it is a separate, larger feature).
- "Preferred city" / "Travel preferences" as real features (no backend model exists; may be designed later).
- Any change to `AuthService`/`StoredUser` app-wide state — the Profile page continues to independently fetch `/api/auth/me` rather than reading from the global auth signal.

## Backend

### Update profile

- **Endpoint**: `PUT /api/auth/me` in `AuthController` (co-located with the existing `GET /me`; same "resolve user from `Authentication`" pattern — the authenticated email is used to look up the user, no client-supplied id is trusted).
- **Request DTO**: new `UpdateProfileRequest(String name, String phone)` in `auth/dto/`, following `RegisterRequest`'s validation style:
  - `name`: `@NotBlank`, `@Size(min = 2, max = 100)`.
  - `phone`: `@NotBlank`, `@Pattern(regexp = "^\\d{10,15}$")`.
- **Service**: new `UserService.updateProfile(String email, String name, String phone)` — loads the user via `getByEmail`, sets `name`/`phone`, saves via the repository, returns the updated `User`.
- **Response**: reuses `UserResponse`, extended with a `securityQuestion` field (so the frontend's already-fetched `/me` payload can show the question text without an extra round trip when the change-password form is opened).

### Change password

- **Endpoint**: `POST /api/auth/change-password` in `AuthController`, authenticated the same way.
- **Request DTO**: new `ChangePasswordRequest(String securityAnswer, String newPassword)`:
  - `securityAnswer`: `@NotBlank`.
  - `newPassword`: `@Size(min = 8)` + the same letter+digit `@Pattern` used at registration.
- **Service**: new `UserService.changePassword(String email, String securityAnswer, String newPassword)` — loads the user, checks `passwordEncoder.matches(securityAnswer, user.getSecurityAnswerHash())` **in the same call** that then sets the new password hash and saves. Verification and update happen atomically in one server-side call — the client never gets a separate "verified" token it could replay, so there's no time-of-check/time-of-use gap.
- **Error handling**: a wrong security answer throws `InvalidRequestException` (existing class in `shared/exception/`), which `GlobalExceptionHandler` already maps to `400 Bad Request` with an `INVALID_REQUEST` code and custom message. The frontend already knows how to render this via `ApiResponse.error.message`.

## Frontend

### Profile component (`profile.ts` / `profile.html`)

- Convert from static `[value]`-bound inputs to a working template-driven form, matching the pattern already used in `register.ts`/`login.ts`: plain `<form (submit)="onSave($event)">`, values read from the native `FormData`, no Reactive Forms/`FormGroup` (this app doesn't use Reactive Forms anywhere — staying consistent).
- Client-side validation before calling the API, mirroring `register.ts`'s manual-check style:
  - Name: non-blank, min 2 characters.
  - Phone: non-blank, matches `^\d{10,15}$`.
  - Validation failures are shown inline per field; server-side failures use the existing `error` signal banner (`border-destructive/30 bg-destructive/10 text-destructive`), reading `err.error?.error?.message`.
- A `submitting` signal disables "Save changes" and swaps its label during the request, matching `register.ts`/`login.ts`.
- On success: show a toast via the existing `ToastService`, and update the local `profile` signal from the response (no page reload).
- Remove the "Preferred city" input and the static "Travel preferences" panel entirely.

### Change password

- Triggered by the existing "Change password" button — expands an inline section in place (not a modal, not a separate route).
- Shows the user's security question as static text (from the extended `/me`/`UserResponse` payload already loaded on the page), plus three inputs: answer, new password, confirm new password.
- Client-side validation: answer non-blank; new password min 8 chars with a letter and a digit (same rule as registration, checked client-side before submit for fast feedback); confirm must match new password.
- On submit: calls the new change-password endpoint. Success → toast, collapse the section, clear the inputs. Failure (e.g. wrong answer) → the same `error` banner pattern, section stays open so the user can retry.

### New service: `profile.service.ts`

- No dedicated profile service exists yet (the component currently calls `HttpClient` directly). Add `features/profile/.../profile.service.ts` (or a shared location matching existing conventions) with `updateProfile(name, phone)` and `changePassword(securityAnswer, newPassword)` methods, following `AuthService`'s pattern: inject `HttpClient`, use `API_BASE_URL`, return typed DTOs unwrapped from `ApiResponse<T>`.
- The existing `GET /api/auth/me` fetch on page load stays in the component (or moves into the same service for consistency — implementation detail for the plan).

## Testing

- Backend: unit tests for `UserServiceImpl.updateProfile` and `changePassword` (happy path, wrong security answer, not-found), plus controller-level validation tests for the new DTOs (blank name, invalid phone, weak new password).
- Frontend: component tests for validation logic (invalid name/phone blocks submit; mismatched confirm-password blocks submit) and for the success/error paths of both forms, matching whatever test patterns already exist for `register`/`login` (if any — the plan should check).
