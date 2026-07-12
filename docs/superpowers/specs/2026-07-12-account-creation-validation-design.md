# Account Creation Validation — Design

Date: 2026-07-12

## Problem

Both account-creation flows — traveler self-registration (`register.ts`/`.html`) and
partner/provider self-registration (`partner-register.ts`/`.html`) — have weak or
missing validation:

- Only a single, hardcoded, read-only security question is offered (not a bank of
  choices).
- Phone number has no digit-count validation.
- Email has no maximum length check (format only).
- Password strength requirements are minimal (8 chars + 1 letter + 1 digit).
- The provider (partner) registration form has almost no field-level validation at
  all — no inline field errors, only a single top-level "passwords don't match"
  check.
- Backend DTOs (`RegisterRequest`, `PartnerRegisterRequest`) mostly rely on
  `@NotBlank`, with no format/length/type constraints matching the above.

## Goals

1. Offer a bank of 6 predefined security questions (pick-one) during account
   creation, replacing the single hardcoded question.
2. Validate phone number as exactly 10 digits.
3. Validate email format and cap it at 100 characters.
4. Enforce password strength: min 8 chars, at least one uppercase, one lowercase,
   one digit, one special character; capped at 72 characters server-side.
5. Bring provider (partner) registration to full parity with traveler registration
   for all of the above, plus role validation.
6. All of the above are enforced on both frontend (inline, per-field) and backend
   (Bean Validation + service-layer whitelist checks), consistent with defense in
   depth already used elsewhere in this codebase (e.g. `registerPartner`'s role
   check).

## Non-goals

- No change to the DB schema. `User.securityQuestion` / `securityAnswerHash`
  remain single-value columns — a user selects and answers exactly one question
  from the bank, same shape as today.
- No changes to `AdminCreateUserRequest` / admin-created accounts, forgot-password,
  or profile-edit flows. Those are out of scope for this task.
- No changes to name validation beyond what already exists in `register.ts`
  (min 2 characters) — just replicated to the partner form for parity.

## Design

### 1. Security question bank

New shared constant, duplicated intentionally (frontend + backend, no shared
package between the two stacks) and kept in sync by convention:

- Frontend: `frontend/src/app/features/auth/security-questions.ts` exporting
  `SECURITY_QUESTIONS: readonly string[]` (6 entries, see below).
- Backend: `backend/src/main/java/com/travelease/backend/auth/SecurityQuestions.java`
  exporting `public static final List<String> ALLOWED`.

Questions (the first two preserve the exact strings already hardcoded across the
existing backend test suite — `UserServiceImplTest` uses "What is the name of the
hospital where you were born?" and `AuthFlowIntegrationTest` uses "What is your
birth hospital?" — so folding both into the bank means zero existing test needs
its security-question literal changed):
1. What is the name of the hospital where you were born?
2. What is your birth hospital?
3. What was the name of your first pet?
4. What is your mother's maiden name?
5. What was the name of your first school?
6. What is your favorite book?

Both `register.html` and `partner-register.html` replace the read-only
`securityQuestion` text input with a `<select>` populated via `@for` from
`SECURITY_QUESTIONS`, defaulting to a blank/placeholder option so the user must
actively choose one (guards against accidentally submitting the first question
unintentionally).

Backend: `UserServiceImpl.register()` and `.registerPartner()` validate the
submitted `securityQuestion` against `SecurityQuestions.ALLOWED` and throw
`InvalidRequestException` (→ 400 `INVALID_REQUEST`) if it doesn't match — the same
pattern already used for the `role` whitelist check in `registerPartner`.

### 2. Field validation rules

| Field | Frontend rule | Backend rule (DTO annotation / service check) |
|---|---|---|
| Phone | `^\d{10}$` on trimmed value | `@Pattern(regexp = "^\\d{10}$")` |
| Email | existing format regex + `maxlength=100` on the input | `@Email` + `@Size(max = 100)` |
| Password | `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$` | same `@Pattern` + `@Size(min = 8, max = 72)` |
| Security question | must be one of `SECURITY_QUESTIONS` (enforced by `<select>`) | must be in `SecurityQuestions.ALLOWED` (service check) |
| Security answer | non-blank | `@NotBlank` (unchanged) |
| Name (traveler + partner) | length >= 2 | `@NotBlank` (unchanged) |
| Role (partner only) | must be selected (enforced by `<select>`, still checked non-blank) | existing `mapRole` + `PROVIDER_ROLES` whitelist (unchanged, already correct) |

Password max of 72 is because the configured `PasswordEncoder` is
`BCryptPasswordEncoder`, which silently truncates input beyond 72 bytes — rejecting
long passwords up front avoids a confusing "your password is wrong" bug for users
who set something longer.

Phone/password placeholder text updates to reflect the new rules (e.g. phone
placeholder becomes `9876543210`; password placeholder becomes something like
`8+ chars, upper, lower, number & symbol`).

### 3. Error display — inline only, no snackbar/toast

All client-side field-validation errors render as inline text under their
respective input, using the `fieldErrors` signal pattern that already exists in
`register.ts` (a `Partial<Record<field, string>>` signal, cleared per-field on
input, rendered as a `<p class="text-xs text-destructive">` under the field). This
pattern is extended to `partner-register.ts`, which currently has no per-field
error state.

The existing top-level banner (`error` signal) is kept only for server-side
responses that aren't a specific field's fault (e.g. "email is already
registered", network failure) — this is unchanged and is not a snackbar/toast
either, just a banner above the form, consistent with current behavior.

### 4. Provider (partner) form parity

`partner-register.ts` gets:
- A `fieldErrors` signal + `clearFieldError()`, mirroring `register.ts`.
- The same validation checks as traveler registration (name, phone, email,
  password, confirm-password, security question, security answer), plus a
  non-blank check on `role`.
- The security-question `<select>` described above.

### 5. Backend DTO changes

`RegisterRequest` and `PartnerRegisterRequest` gain `@Pattern`/`@Size` constraints
per the table above. `UserServiceImpl.register()` and `.registerPartner()` gain the
security-question whitelist check. No changes to `AuthController`,
`GlobalExceptionHandler`, or the `ApiResponse`/`ApiError` shape — validation
failures already surface correctly as 400 `VALIDATION_ERROR` (Bean Validation) or
400 `INVALID_REQUEST` (service-layer whitelist checks).

### 6. Testing

- `register.spec.ts`: fix the stale "renders all 5 fields empty" assertion (the
  form already renders 7 `<input>` elements today, which the current test
  incorrectly asserts against) to reflect the actual field count after the
  `<select>` swap; add cases for phone/email/password/security-question rejection
  and the corrected happy path.
- `partner-register.spec.ts`: add the same class of cases (currently has none
  beyond the happy path and password-mismatch).
- Backend: add/extend tests around `RegisterRequest`/`PartnerRegisterRequest`
  validation and the `UserServiceImpl` security-question whitelist check.

## Open assumptions (flag if wrong)

- Email cap of 100 characters and password cap of 72 characters were not specified
  by the user; chosen as reasonable/defensible defaults (72 tied directly to the
  BCrypt truncation limit). Confirmed acceptable in this document; not something
  requiring separate sign-off.

## Existing-test compatibility

The new password rule (upper + lower + digit + special) breaks the existing
`"Passw0rd1"` fixture literal (no special character) used in every
`RegisterRequest`/`PartnerRegisterRequest` construction — but only where that
construction goes through real Bean Validation. `AuthFlowIntegrationTest.java`
does (it POSTs through `TestRestTemplate` to the real `@Valid`-annotated
controller endpoints), so its ~15 occurrences of `"Passw0rd1"` need a scoped
find/replace to `"Passw0rd1!"` (the exact quoted token doesn't appear inside the
unrelated `"NewPassw0rd1"` literal used by change-password/reset-password tests,
so those are unaffected). `UserServiceImplTest.java` calls
`userService.register(...)`/`registerPartner(...)` directly with a
hand-constructed record, bypassing Bean Validation entirely (no `@Valid`, no
Spring context) — its `"Passw0rd1"` literals are unaffected by the new
`@Pattern`/`@Size` annotations and need no change. The phone literal
`"9999999999"` already satisfies the new 10-digit rule everywhere and needs no
change either.
