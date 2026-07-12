# Account Creation Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bank of 6 security questions (pick-one), and enforce phone/email/password format rules, on both the traveler (`register`) and provider (`partner-register`) account-creation flows, with inline per-field error display (no snackbar/toast) on the frontend and matching Bean Validation on the backend.

**Architecture:** No schema changes. `User.securityQuestion`/`securityAnswerHash` stay single-value; the frontend now offers a `<select>` of 6 predefined questions instead of one hardcoded read-only question, and the backend validates the submitted question against the same whitelist. Phone/email/password get explicit `@Pattern`/`@Size` constraints on `RegisterRequest`/`PartnerRegisterRequest`, mirrored by inline client-side checks using the existing `fieldErrors` signal pattern already in `register.ts` (now extended to `partner-register.ts`, which currently has none).

**Tech Stack:** Java 17 / Spring Boot 3.5 (Bean Validation, JUnit 5, Mockito, AssertJ) for the backend; Angular (standalone components, signals, Vitest) for the frontend.

## Global Constraints

- Security question bank (exactly these 6, in this order) — the first two preserve strings already hardcoded in existing backend tests so no existing test's security-question literal needs to change:
  1. `What is the name of the hospital where you were born?`
  2. `What is your birth hospital?`
  3. `What was the name of your first pet?`
  4. `What is your mother's maiden name?`
  5. `What was the name of your first school?`
  6. `What is your favorite book?`
- Phone: exactly 10 digits, digits only — regex `^\d{10}$`.
- Email: existing format check, plus max 100 characters.
- Password: min 8, max 72 characters (BCrypt truncates beyond 72 bytes), must contain at least one uppercase letter, one lowercase letter, one digit, and one special character — regex `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$`.
- All client-side validation errors render inline under their input (the `fieldErrors` signal pattern). Never use a snackbar/toast for field validation.
- Full design context: `docs/superpowers/specs/2026-07-12-account-creation-validation-design.md`.

---

## Task 1: Backend — security question bank + whitelist validation

**Files:**
- Create: `backend/src/main/java/com/travelease/backend/auth/SecurityQuestions.java`
- Modify: `backend/src/main/java/com/travelease/backend/auth/service/UserServiceImpl.java:37-66` (register), `:97-121` (registerPartner)
- Test: `backend/src/test/java/com/travelease/backend/auth/service/UserServiceImplTest.java`

**Interfaces:**
- Produces: `SecurityQuestions.ALLOWED` — `public static final List<String> ALLOWED`, a `java.util.List<String>` of the 6 questions listed in Global Constraints, in that exact order. Later tasks (none in this plan) may reference it; this task is self-contained otherwise.

- [ ] **Step 1: Write the failing tests**

Add these two tests to `UserServiceImplTest.java`, right after `registerRejectsDuplicateEmail` (after line 135) and right after `registerPartnerRejectsDuplicateEmail` (after line 174) respectively — insert both in one edit, placed together after `registerPartnerRejectsDuplicateEmail`:

```java
    @Test
    void registerRejectsUnknownSecurityQuestion() {
        RegisterRequest request = new RegisterRequest(
                "Asha",
                "asha-unknown-question@example.com",
                "9999999999",
                "Passw0rd1",
                "What is your favorite color?",
                "Blue"
        );
        when(userRepository.existsByEmail("asha-unknown-question@example.com")).thenReturn(false);

        assertThatThrownBy(() -> userService.register(request))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void registerPartnerRejectsUnknownSecurityQuestion() {
        PartnerRegisterRequest request = new PartnerRegisterRequest(
                "Priya", "priya-unknown-question@example.com", "9999999999", "Passw0rd1", "HOTEL_PROVIDER",
                "What is your favorite color?", "Blue");
        when(userRepository.existsByEmail("priya-unknown-question@example.com")).thenReturn(false);

        assertThatThrownBy(() -> userService.registerPartner(request))
                .isInstanceOf(InvalidRequestException.class);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && ./mvnw -q test -Dtest=UserServiceImplTest`
Expected: `registerRejectsUnknownSecurityQuestion` and `registerPartnerRejectsUnknownSecurityQuestion` FAIL (no exception thrown — `userRepository.save` gets called instead), all other tests in the class still PASS.

- [ ] **Step 3: Create the `SecurityQuestions` constant**

Create `backend/src/main/java/com/travelease/backend/auth/SecurityQuestions.java`:

```java
package com.travelease.backend.auth;

import java.util.List;

public final class SecurityQuestions {

    public static final List<String> ALLOWED = List.of(
            "What is the name of the hospital where you were born?",
            "What is your birth hospital?",
            "What was the name of your first pet?",
            "What is your mother's maiden name?",
            "What was the name of your first school?",
            "What is your favorite book?"
    );

    private SecurityQuestions() {
    }
}
```

- [ ] **Step 4: Wire the whitelist check into `UserServiceImpl`**

In `backend/src/main/java/com/travelease/backend/auth/service/UserServiceImpl.java`, add the import:

```java
import com.travelease.backend.auth.SecurityQuestions;
```

In `register(RegisterRequest request)` (currently lines 39-66), insert the check immediately after the existing duplicate-email check (after line 42's closing `}`):

```java
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("Email is already registered: " + request.email());
        }
        if (!SecurityQuestions.ALLOWED.contains(request.securityQuestion())) {
            throw new InvalidRequestException("securityQuestion must be one of the supported security questions");
        }
```

In `registerPartner(PartnerRegisterRequest request)` (currently lines 99-121), insert the same check immediately after its duplicate-email check (after line 102's closing `}`, before the `role` mapping):

```java
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("Email is already registered: " + request.email());
        }
        if (!SecurityQuestions.ALLOWED.contains(request.securityQuestion())) {
            throw new InvalidRequestException("securityQuestion must be one of the supported security questions");
        }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && ./mvnw -q test -Dtest=UserServiceImplTest`
Expected: all tests in `UserServiceImplTest` PASS, including the two new ones.

- [ ] **Step 6: Run the full backend test suite to check for regressions**

Run: `cd backend && ./mvnw -q test`
Expected: BUILD SUCCESS. (`AuthFlowIntegrationTest` registers users with `"What is the name of the hospital where you were born?"` and `"What is your birth hospital?"` — both are in `SecurityQuestions.ALLOWED`, so no regression there.)

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/travelease/backend/auth/SecurityQuestions.java backend/src/main/java/com/travelease/backend/auth/service/UserServiceImpl.java backend/src/test/java/com/travelease/backend/auth/service/UserServiceImplTest.java
git commit -m "Add security question whitelist validation to registration"
```

---

## Task 2: Backend — phone/email/password field constraints

**Files:**
- Modify: `backend/src/main/java/com/travelease/backend/auth/dto/RegisterRequest.java`
- Modify: `backend/src/main/java/com/travelease/backend/auth/dto/PartnerRegisterRequest.java`
- Test: `backend/src/test/java/com/travelease/backend/auth/controller/AuthFlowIntegrationTest.java`

**Interfaces:**
- Consumes: nothing from Task 1 (independent DTO-level change).
- Produces: nothing consumed by later tasks — frontend tasks implement matching rules independently per the Global Constraints table, not by importing backend code.

- [ ] **Step 1: Fix the existing `"Passw0rd1"` fixture literal in the integration test**

`AuthFlowIntegrationTest.java` POSTs through the real `@Valid`-annotated controller endpoints via `TestRestTemplate`, so once password strength constraints are added, its existing `"Passw0rd1"` literal (no special character) will start failing registration. Replace every exact occurrence of the quoted literal `"Passw0rd1"` with `"Passw0rd1!"` in this file (this does not touch the unrelated `"NewPassw0rd1"` literal used by change-password/reset-password tests — that token is untouched because the quoted string `"Passw0rd1"` is not a substring of the quoted string `"NewPassw0rd1"`).

Do this as a single edit replacing all occurrences of `"Passw0rd1"` with `"Passw0rd1!"` in `backend/src/test/java/com/travelease/backend/auth/controller/AuthFlowIntegrationTest.java`. (There are 16 occurrences, on lines 38, 43, 78, 89, 101, 107, 118, 140, 165, 167, 184, 186, 199, 201, 217, 219. Verify with `grep -c '"Passw0rd1"' backend/src/test/java/com/travelease/backend/auth/controller/AuthFlowIntegrationTest.java` before and after: before should show 16 matches, after should show 0 matches for the bare `"Passw0rd1"` token and `grep -c '"Passw0rd1!"'` should show 16.)

- [ ] **Step 2: Run the integration test to verify it still passes before adding new constraints**

Run: `cd backend && ./mvnw -q test -Dtest=AuthFlowIntegrationTest`
Expected: BUILD SUCCESS (this step is a checkpoint — the literal swap alone must not break anything, since `"Passw0rd1!"` still satisfies today's weaker password rule).

- [ ] **Step 3: Write the failing validation-rejection tests**

Add these four tests to `AuthFlowIntegrationTest.java`, immediately after `registerRejectsInvalidPayload` (after line 161):

```java
    @Test
    void registerRejectsPasswordMissingSpecialCharacter() {
        RegisterRequest invalidRequest = new RegisterRequest(
                "Asha", "asha-weak-pwd@example.com", "9999999999", "Passw0rd1",
                "What is your birth hospital?", "City General");

        ResponseEntity<ApiResponse> response =
                restTemplate.postForEntity("/api/auth/register", invalidRequest, ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void registerRejectsPhoneWithWrongDigitCount() {
        RegisterRequest invalidRequest = new RegisterRequest(
                "Asha", "asha-bad-phone@example.com", "12345", "Passw0rd1!",
                "What is your birth hospital?", "City General");

        ResponseEntity<ApiResponse> response =
                restTemplate.postForEntity("/api/auth/register", invalidRequest, ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void registerRejectsEmailOverMaxLength() {
        String overlongEmail = "a".repeat(95) + "@ex.com";
        RegisterRequest invalidRequest = new RegisterRequest(
                "Asha", overlongEmail, "9999999999", "Passw0rd1!",
                "What is your birth hospital?", "City General");

        ResponseEntity<ApiResponse> response =
                restTemplate.postForEntity("/api/auth/register", invalidRequest, ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void registerPartnerRejectsInvalidPayload() {
        PartnerRegisterRequest invalidRequest = new PartnerRegisterRequest(
                "", "not-an-email", "12345", "short", "HOTEL_PROVIDER", "", "");

        ResponseEntity<ApiResponse> response =
                restTemplate.postForEntity("/api/auth/register/partner", invalidRequest, ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd backend && ./mvnw -q test -Dtest=AuthFlowIntegrationTest`
Expected: the four new tests FAIL with `201 CREATED` instead of the expected `400 BAD_REQUEST` (current DTOs accept these payloads); all pre-existing tests in the class still PASS.

- [ ] **Step 5: Add the constraints to `RegisterRequest`**

Replace the full contents of `backend/src/main/java/com/travelease/backend/auth/dto/RegisterRequest.java`:

```java
package com.travelease.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "name is required")
        String name,

        @NotBlank(message = "email is required")
        @Email(message = "email must be valid")
        @Size(max = 100, message = "email must be at most 100 characters")
        String email,

        @NotBlank(message = "phone is required")
        @Pattern(regexp = "^\\d{10}$", message = "phone must be exactly 10 digits")
        String phone,

        @NotBlank(message = "password is required")
        @Size(min = 8, max = 72, message = "password must be between 8 and 72 characters")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
                message = "password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
        )
        String password,

        @NotBlank(message = "security question is required")
        String securityQuestion,

        @NotBlank(message = "security answer is required")
        String securityAnswer
) {
}
```

- [ ] **Step 6: Add the same constraints to `PartnerRegisterRequest`**

Replace the full contents of `backend/src/main/java/com/travelease/backend/auth/dto/PartnerRegisterRequest.java`:

```java
package com.travelease.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PartnerRegisterRequest(
        @NotBlank(message = "name is required")
        String name,

        @NotBlank(message = "email is required")
        @Email(message = "email must be valid")
        @Size(max = 100, message = "email must be at most 100 characters")
        String email,

        @NotBlank(message = "phone is required")
        @Pattern(regexp = "^\\d{10}$", message = "phone must be exactly 10 digits")
        String phone,

        @NotBlank(message = "password is required")
        @Size(min = 8, max = 72, message = "password must be between 8 and 72 characters")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
                message = "password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
        )
        String password,

        @NotBlank(message = "role is required")
        String role,

        @NotBlank(message = "security question is required")
        String securityQuestion,

        @NotBlank(message = "security answer is required")
        String securityAnswer
) {
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && ./mvnw -q test -Dtest=AuthFlowIntegrationTest`
Expected: all tests in `AuthFlowIntegrationTest` PASS, including the four new ones.

- [ ] **Step 8: Run the full backend test suite to check for regressions**

Run: `cd backend && ./mvnw -q test`
Expected: BUILD SUCCESS. (`UserServiceImplTest` bypasses `@Valid` entirely by calling the service directly, so its unchanged `"Passw0rd1"` literals are unaffected by this task.)

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/travelease/backend/auth/dto/RegisterRequest.java backend/src/main/java/com/travelease/backend/auth/dto/PartnerRegisterRequest.java backend/src/test/java/com/travelease/backend/auth/controller/AuthFlowIntegrationTest.java
git commit -m "Enforce phone/email/password format rules on registration DTOs"
```

---

## Task 3: Frontend — traveler registration (security question select + field validation)

**Files:**
- Create: `frontend/src/app/features/auth/security-questions.ts`
- Modify: `frontend/src/app/features/auth/components/register/register.ts`
- Modify: `frontend/src/app/features/auth/components/register/register.html`
- Test: `frontend/src/app/features/auth/components/register/register.spec.ts`

**Interfaces:**
- Produces: `SECURITY_QUESTIONS: readonly string[]` exported from `frontend/src/app/features/auth/security-questions.ts` — a 6-element array matching the Global Constraints list verbatim. Consumed by Task 4.

- [ ] **Step 1: Create the shared security question bank**

Create `frontend/src/app/features/auth/security-questions.ts`:

```typescript
export const SECURITY_QUESTIONS: readonly string[] = [
  'What is the name of the hospital where you were born?',
  'What is your birth hospital?',
  'What was the name of your first pet?',
  "What is your mother's maiden name?",
  'What was the name of your first school?',
  'What is your favorite book?',
];
```

- [ ] **Step 2: Write the failing spec**

Replace the full contents of `frontend/src/app/features/auth/components/register/register.spec.ts`:

```typescript
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_BASE_URL } from '@app/core/api/api-config';
import { Register } from '@app/features/auth/components/register/register';

describe('Register', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Register);
    const router = TestBed.inject(Router);
    const http = TestBed.inject(HttpTestingController);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    return { fixture, navigateSpy, http };
  }

  function fillForm(el: HTMLElement) {
    (el.querySelector('#name') as HTMLInputElement).value = 'Jane Doe';
    (el.querySelector('#phone') as HTMLInputElement).value = '9876543210';
    (el.querySelector('#email') as HTMLInputElement).value = 'jane@example.com';
    (el.querySelector('#password') as HTMLInputElement).value = 'Passw0rd1!';
    (el.querySelector('#confirmPassword') as HTMLInputElement).value = 'Passw0rd1!';
    (el.querySelector('#securityQuestion') as HTMLSelectElement).value =
      'What was the name of your first pet?';
    (el.querySelector('#securityAnswer') as HTMLInputElement).value = 'Rex';
  }

  it('renders empty name, phone, email, password, confirmPassword and securityAnswer inputs plus a security question select', async () => {
    const { fixture } = await setup();
    const el = fixture.nativeElement as HTMLElement;
    const inputs = Array.from(el.querySelectorAll('input')) as HTMLInputElement[];
    expect(inputs).toHaveLength(6);
    for (const input of inputs) {
      expect(input.value).toBe('');
    }
    expect(el.querySelector('select#securityQuestion')).not.toBeNull();
  });

  it('blocks submission and shows inline errors when required fields are invalid', async () => {
    const { fixture, navigateSpy } = await setup();
    const form = (fixture.nativeElement as HTMLElement).querySelector('form')!;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();

    expect(navigateSpy).not.toHaveBeenCalled();
    const errorTexts = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('p.text-destructive'),
    ).map((p) => p.textContent);
    expect(errorTexts.some((t) => t?.includes('10 digits'))).toBe(true);
    expect(errorTexts.some((t) => t?.includes('security question'))).toBe(true);
  });

  it('rejects a password without a special character', async () => {
    const { fixture, navigateSpy } = await setup();
    const el = fixture.nativeElement as HTMLElement;
    fillForm(el);
    (el.querySelector('#password') as HTMLInputElement).value = 'Passw0rd1';
    (el.querySelector('#confirmPassword') as HTMLInputElement).value = 'Passw0rd1';

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true, bubbles: true }),
    );
    fixture.detectChanges();

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('submits and navigates to /login on success', async () => {
    const { fixture, navigateSpy, http } = await setup();
    const el = fixture.nativeElement as HTMLElement;
    fillForm(el);

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true, bubbles: true }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const req = http.expectOne(`${API_BASE_URL}/api/auth/register`);
    expect(req.request.body.phone).toBe('9876543210');
    expect(req.request.body.securityQuestion).toBe('What was the name of your first pet?');
    req.flush({ success: true, data: { id: '1' }, message: 'ok', error: null });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    http.verify();
  });

  it('points the footer link to /login', async () => {
    const { fixture } = await setup();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/login"]');
    expect(link).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run the spec to verify it fails**

Run: `cd frontend && npx vitest run src/app/features/auth/components/register/register.spec.ts`
Expected: FAIL — the "6 inputs + select" assertion fails against the current 7-input markup (no select yet), and the password-without-special-character / navigates-to-/login cases fail because the component doesn't yet enforce the new password rule or expose a `securityQuestion` select.

- [ ] **Step 4: Update `register.ts`**

Replace the full contents of `frontend/src/app/features/auth/components/register/register.ts`:

```typescript
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { AuthService } from '@app/core/auth/auth.service';
import { SECURITY_QUESTIONS } from '@app/features/auth/security-questions';

type RegisterField =
  | 'name'
  | 'phone'
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'securityQuestion'
  | 'securityAnswer';

@Component({
  selector: 'app-register',
  imports: [RouterLink, HlmButtonImports, HlmInputImports, HlmLabelImports],
  templateUrl: './register.html',
})
export class Register {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected readonly securityQuestions = SECURITY_QUESTIONS;
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly fieldErrors = signal<Partial<Record<RegisterField, string>>>({});

  protected clearFieldError(field: RegisterField): void {
    const { [field]: _removed, ...rest } = this.fieldErrors();
    this.fieldErrors.set(rest);
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);

    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const confirmPassword = String(data.get('confirmPassword') ?? '');
    const securityQuestion = String(data.get('securityQuestion') ?? '').trim();
    const securityAnswer = String(data.get('securityAnswer') ?? '').trim();

    const errors: Partial<Record<RegisterField, string>> = {};
    if (name.length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }
    if (!/^\d{10}$/.test(phone)) {
      errors.phone = 'Phone number must be exactly 10 digits.';
    }
    if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Enter a valid email address (max 100 characters).';
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
      errors.password =
        'Password must be 8+ characters with uppercase, lowercase, a digit, and a special character.';
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match.';
    }
    if (!securityQuestion) {
      errors.securityQuestion = 'Please choose a security question.';
    }
    if (!securityAnswer) {
      errors.securityAnswer = 'Security answer is required.';
    }
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    this.submitting.set(true);
    try {
      await this.authService.register({
        name,
        email,
        phone,
        password,
        securityQuestion,
        securityAnswer,
      });
      this.router.navigate(['/login']);
    } catch (err) {
      this.error.set(
        err instanceof HttpErrorResponse
          ? (err.error?.error?.message ?? 'Unable to create your account right now.')
          : 'Unable to create your account right now.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
```

- [ ] **Step 5: Update `register.html`**

Replace the full contents of `frontend/src/app/features/auth/components/register/register.html`:

```html
<h1 class="text-2xl font-semibold tracking-tight">Create your account</h1>
<p class="text-sm text-muted-foreground mt-1 mb-6">Start planning your first group trip in minutes.</p>

<form class="space-y-4" (submit)="onSubmit($event)">
  @if (error()) {
    <div class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      {{ error() }}
    </div>
  }

  <div class="grid grid-cols-2 gap-3">
    <div class="space-y-2">
      <label hlmLabel for="name">Name</label>
      <input hlmInput id="name" name="name" placeholder="Jane Doe" (input)="clearFieldError('name')" />
      @if (fieldErrors().name) {
        <p class="text-xs text-destructive">{{ fieldErrors().name }}</p>
      }
    </div>
    <div class="space-y-2">
      <label hlmLabel for="phone">Phone</label>
      <input hlmInput id="phone" name="phone" placeholder="9876543210" (input)="clearFieldError('phone')" />
      @if (fieldErrors().phone) {
        <p class="text-xs text-destructive">{{ fieldErrors().phone }}</p>
      }
    </div>
  </div>
  <div class="space-y-2">
    <label hlmLabel for="email">Email</label>
    <input hlmInput id="email" name="email" type="email" maxlength="100" placeholder="you@example.com" (input)="clearFieldError('email')" />
    @if (fieldErrors().email) {
      <p class="text-xs text-destructive">{{ fieldErrors().email }}</p>
    }
  </div>
  <div class="space-y-2">
    <label hlmLabel for="password">Password</label>
    <input hlmInput id="password" name="password" type="password" placeholder="8+ chars: upper, lower, number & symbol" (input)="clearFieldError('password')" />
    @if (fieldErrors().password) {
      <p class="text-xs text-destructive">{{ fieldErrors().password }}</p>
    }
  </div>
  <div class="space-y-2">
    <label hlmLabel for="confirmPassword">Confirm password</label>
    <input hlmInput id="confirmPassword" name="confirmPassword" type="password" (input)="clearFieldError('confirmPassword')" />
    @if (fieldErrors().confirmPassword) {
      <p class="text-xs text-destructive">{{ fieldErrors().confirmPassword }}</p>
    }
  </div>
  <div class="space-y-2">
    <label hlmLabel for="securityQuestion">Security question</label>
    <select
      id="securityQuestion"
      name="securityQuestion"
      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      (change)="clearFieldError('securityQuestion')"
    >
      <option value="" selected disabled>Choose a security question</option>
      @for (question of securityQuestions; track question) {
        <option [value]="question">{{ question }}</option>
      }
    </select>
    @if (fieldErrors().securityQuestion) {
      <p class="text-xs text-destructive">{{ fieldErrors().securityQuestion }}</p>
    }
  </div>
  <div class="space-y-2">
    <label hlmLabel for="securityAnswer">Your answer</label>
    <input hlmInput id="securityAnswer" name="securityAnswer" placeholder="Enter your answer" (input)="clearFieldError('securityAnswer')" />
    @if (fieldErrors().securityAnswer) {
      <p class="text-xs text-destructive">{{ fieldErrors().securityAnswer }}</p>
    }
  </div>
  <button hlmBtn type="submit" class="w-full" [disabled]="submitting()">
    {{ submitting() ? 'Creating account...' : 'Create account' }}
  </button>
</form>

<p class="text-sm text-muted-foreground mt-6 text-center">
  Already have an account? <a routerLink="/login" class="text-primary font-medium">Sign in</a>
</p>
<p class="text-sm text-muted-foreground mt-2 text-center">
  Are you a hotel, transport or activity partner? <a routerLink="/partner-register" class="text-primary font-medium">Register your business</a>
</p>
```

- [ ] **Step 6: Run the spec to verify it passes**

Run: `cd frontend && npx vitest run src/app/features/auth/components/register/register.spec.ts`
Expected: PASS, all 5 tests.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/features/auth/security-questions.ts frontend/src/app/features/auth/components/register/register.ts frontend/src/app/features/auth/components/register/register.html frontend/src/app/features/auth/components/register/register.spec.ts
git commit -m "Add security question select and field validation to traveler registration"
```

---

## Task 4: Frontend — provider registration parity

**Files:**
- Modify: `frontend/src/app/features/auth/components/partner-register/partner-register.ts`
- Modify: `frontend/src/app/features/auth/components/partner-register/partner-register.html`
- Test: `frontend/src/app/features/auth/components/partner-register/partner-register.spec.ts`

**Interfaces:**
- Consumes: `SECURITY_QUESTIONS` from `frontend/src/app/features/auth/security-questions.ts` (Task 3).

- [ ] **Step 1: Write the failing spec additions**

Replace the full contents of `frontend/src/app/features/auth/components/partner-register/partner-register.spec.ts`:

```typescript
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@app/core/api/api-config';
import { PartnerRegister } from '@app/features/auth/components/partner-register/partner-register';

describe('PartnerRegister', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [PartnerRegister],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(PartnerRegister);
    const http = TestBed.inject(HttpTestingController);
    return { fixture, http };
  }

  function fillForm(el: HTMLElement) {
    (el.querySelector('#name') as HTMLInputElement).value = 'Priya Partner';
    (el.querySelector('#phone') as HTMLInputElement).value = '9999999999';
    (el.querySelector('#email') as HTMLInputElement).value = 'priya@example.com';
    (el.querySelector('#role') as HTMLSelectElement).value = 'HOTEL_PROVIDER';
    (el.querySelector('#password') as HTMLInputElement).value = 'Passw0rd1!';
    (el.querySelector('#confirmPassword') as HTMLInputElement).value = 'Passw0rd1!';
    (el.querySelector('#securityQuestion') as HTMLSelectElement).value =
      'What was the name of your first pet?';
    (el.querySelector('#securityAnswer') as HTMLInputElement).value = 'City General';
  }

  it('submits the application and shows a pending-approval message', async () => {
    const { fixture, http } = await setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    fillForm(el);

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const req = http.expectOne(`${API_BASE_URL}/api/auth/register/partner`);
    expect(req.request.body.role).toBe('HOTEL_PROVIDER');
    expect(req.request.body.securityQuestion).toBe('What was the name of your first pet?');
    req.flush({ success: true, data: { id: '1' }, message: 'ok', error: null });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(fixture.componentInstance.success()).toContain('awaiting admin approval');
    http.verify();
  });

  it('blocks submission when phone is not exactly 10 digits', async () => {
    const { fixture, http } = await setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    fillForm(el);
    (el.querySelector('#phone') as HTMLInputElement).value = '12345';

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    http.expectNone(`${API_BASE_URL}/api/auth/register/partner`);
    expect(el.textContent).toContain('exactly 10 digits');
  });

  it('blocks submission when password has no special character', async () => {
    const { fixture, http } = await setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    fillForm(el);
    (el.querySelector('#password') as HTMLInputElement).value = 'Passw0rd1';
    (el.querySelector('#confirmPassword') as HTMLInputElement).value = 'Passw0rd1';

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    http.expectNone(`${API_BASE_URL}/api/auth/register/partner`);
  });

  it('blocks submission when no security question is chosen', async () => {
    const { fixture, http } = await setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    fillForm(el);
    (el.querySelector('#securityQuestion') as HTMLSelectElement).value = '';

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    http.expectNone(`${API_BASE_URL}/api/auth/register/partner`);
  });
});
```

- [ ] **Step 2: Run the spec to verify the new tests fail**

Run: `cd frontend && npx vitest run src/app/features/auth/components/partner-register/partner-register.spec.ts`
Expected: the happy-path test fails (no `#securityQuestion` select exists yet, and the current form has no field named to match), and the three new blocking tests fail because the component currently submits regardless of phone/password/security-question validity.

- [ ] **Step 3: Update `partner-register.ts`**

Replace the full contents of `frontend/src/app/features/auth/components/partner-register/partner-register.ts`:

```typescript
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { AuthService } from '@app/core/auth/auth.service';
import { SECURITY_QUESTIONS } from '@app/features/auth/security-questions';

type PartnerRegisterField =
  | 'name'
  | 'phone'
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'role'
  | 'securityQuestion'
  | 'securityAnswer';

@Component({
  selector: 'app-partner-register',
  imports: [RouterLink, HlmButtonImports, HlmInputImports, HlmLabelImports],
  templateUrl: './partner-register.html',
})
export class PartnerRegister {
  private readonly authService = inject(AuthService);

  protected readonly securityQuestions = SECURITY_QUESTIONS;
  protected readonly error = signal<string | null>(null);
  public readonly success = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly fieldErrors = signal<Partial<Record<PartnerRegisterField, string>>>({});

  protected clearFieldError(field: PartnerRegisterField): void {
    const { [field]: _removed, ...rest } = this.fieldErrors();
    this.fieldErrors.set(rest);
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);
    this.success.set(null);

    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const confirmPassword = String(data.get('confirmPassword') ?? '');
    const role = String(data.get('role') ?? '');
    const securityQuestion = String(data.get('securityQuestion') ?? '').trim();
    const securityAnswer = String(data.get('securityAnswer') ?? '').trim();

    const errors: Partial<Record<PartnerRegisterField, string>> = {};
    if (name.length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }
    if (!/^\d{10}$/.test(phone)) {
      errors.phone = 'Phone number must be exactly 10 digits.';
    }
    if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Enter a valid email address (max 100 characters).';
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
      errors.password =
        'Password must be 8+ characters with uppercase, lowercase, a digit, and a special character.';
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match.';
    }
    if (!role) {
      errors.role = 'Please select a partner type.';
    }
    if (!securityQuestion) {
      errors.securityQuestion = 'Please choose a security question.';
    }
    if (!securityAnswer) {
      errors.securityAnswer = 'Security answer is required.';
    }
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    this.submitting.set(true);
    try {
      await this.authService.registerPartner({
        name,
        email,
        phone,
        password,
        role,
        securityQuestion,
        securityAnswer,
      });
      this.success.set('Your application has been submitted and is awaiting admin approval.');
    } catch (err) {
      this.error.set(
        err instanceof HttpErrorResponse
          ? (err.error?.error?.message ?? 'Unable to submit your application right now.')
          : 'Unable to submit your application right now.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
```

- [ ] **Step 4: Update `partner-register.html`**

Replace the full contents of `frontend/src/app/features/auth/components/partner-register/partner-register.html`:

```html
<h1 class="text-2xl font-semibold tracking-tight">Register your business</h1>
<p class="text-sm text-muted-foreground mt-1 mb-6">Apply as a hotel, transport or activity partner. An admin will review your application.</p>

<form class="space-y-4" (submit)="onSubmit($event)">
  @if (error()) {
    <div class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      {{ error() }}
    </div>
  }
  @if (success()) {
    <div class="rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">
      {{ success() }}
    </div>
  }

  <div class="grid grid-cols-2 gap-3">
    <div class="space-y-2">
      <label hlmLabel for="name">Business owner name</label>
      <input hlmInput id="name" name="name" placeholder="Jane Doe" (input)="clearFieldError('name')" />
      @if (fieldErrors().name) {
        <p class="text-xs text-destructive">{{ fieldErrors().name }}</p>
      }
    </div>
    <div class="space-y-2">
      <label hlmLabel for="phone">Phone</label>
      <input hlmInput id="phone" name="phone" placeholder="9876543210" (input)="clearFieldError('phone')" />
      @if (fieldErrors().phone) {
        <p class="text-xs text-destructive">{{ fieldErrors().phone }}</p>
      }
    </div>
  </div>
  <div class="space-y-2">
    <label hlmLabel for="email">Email</label>
    <input hlmInput id="email" name="email" type="email" maxlength="100" placeholder="you@example.com" (input)="clearFieldError('email')" />
    @if (fieldErrors().email) {
      <p class="text-xs text-destructive">{{ fieldErrors().email }}</p>
    }
  </div>
  <div class="space-y-2">
    <label hlmLabel for="role">Partner type</label>
    <select
      id="role"
      name="role"
      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      (change)="clearFieldError('role')"
    >
      <option value="HOTEL_PROVIDER">Hotel Provider</option>
      <option value="PROVIDER">Bus Provider</option>
      <option value="ACTIVITY_PROVIDER">Activity Provider</option>
    </select>
    @if (fieldErrors().role) {
      <p class="text-xs text-destructive">{{ fieldErrors().role }}</p>
    }
  </div>
  <div class="space-y-2">
    <label hlmLabel for="password">Password</label>
    <input hlmInput id="password" name="password" type="password" placeholder="8+ chars: upper, lower, number & symbol" (input)="clearFieldError('password')" />
    @if (fieldErrors().password) {
      <p class="text-xs text-destructive">{{ fieldErrors().password }}</p>
    }
  </div>
  <div class="space-y-2">
    <label hlmLabel for="confirmPassword">Confirm password</label>
    <input hlmInput id="confirmPassword" name="confirmPassword" type="password" (input)="clearFieldError('confirmPassword')" />
    @if (fieldErrors().confirmPassword) {
      <p class="text-xs text-destructive">{{ fieldErrors().confirmPassword }}</p>
    }
  </div>
  <div class="space-y-2">
    <label hlmLabel for="securityQuestion">Security question</label>
    <select
      id="securityQuestion"
      name="securityQuestion"
      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      (change)="clearFieldError('securityQuestion')"
    >
      <option value="" selected disabled>Choose a security question</option>
      @for (question of securityQuestions; track question) {
        <option [value]="question">{{ question }}</option>
      }
    </select>
    @if (fieldErrors().securityQuestion) {
      <p class="text-xs text-destructive">{{ fieldErrors().securityQuestion }}</p>
    }
  </div>
  <div class="space-y-2">
    <label hlmLabel for="securityAnswer">Your answer</label>
    <input hlmInput id="securityAnswer" name="securityAnswer" placeholder="Enter your answer" (input)="clearFieldError('securityAnswer')" />
    @if (fieldErrors().securityAnswer) {
      <p class="text-xs text-destructive">{{ fieldErrors().securityAnswer }}</p>
    }
  </div>
  <button hlmBtn type="submit" class="w-full" [disabled]="submitting()">
    {{ submitting() ? 'Submitting...' : 'Submit application' }}
  </button>
</form>

<p class="text-sm text-muted-foreground mt-6 text-center">
  Not a partner? <a routerLink="/register" class="text-primary font-medium">Create a traveler account</a>
</p>
```

- [ ] **Step 5: Run the spec to verify it passes**

Run: `cd frontend && npx vitest run src/app/features/auth/components/partner-register/partner-register.spec.ts`
Expected: PASS, all 4 tests.

- [ ] **Step 6: Run the full frontend test suite to check for regressions**

Run: `cd frontend && npx vitest run`
Expected: no failures caused by this change (other specs don't reference `register`/`partner-register` internals).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/features/auth/components/partner-register/partner-register.ts frontend/src/app/features/auth/components/partner-register/partner-register.html frontend/src/app/features/auth/components/partner-register/partner-register.spec.ts
git commit -m "Bring provider registration to validation parity with traveler registration"
```

---

## Final verification

- [ ] Run `cd backend && ./mvnw -q test` — expect BUILD SUCCESS.
- [ ] Run `cd frontend && npx vitest run` — expect no failures.
- [ ] Manually exercise both forms in the browser (`ng serve` + `./mvnw spring-boot:run`): submit each with an invalid phone, an over-length email, a weak password, and no security question chosen, confirming each error renders inline under its field (never a snackbar/toast); then submit valid data and confirm success (redirect to `/login` for traveler, pending-approval message for partner).
