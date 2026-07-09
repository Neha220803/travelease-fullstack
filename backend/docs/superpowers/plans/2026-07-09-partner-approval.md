# Partner Approval Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let hotel/transport/activity partners self-register into a `PENDING` state, block their login until an admin approves them, and give admins a working approve/reject queue.

**Architecture:** A new `status` field (`ApprovalStatus`: PENDING/APPROVED/REJECTED) on the existing `User` entity, defaulting to `APPROVED` so travelers and admin-created accounts are unaffected. A new public `POST /api/auth/register/partner` endpoint creates provider-role accounts as `PENDING`. `AuthServiceImpl.login` blocks pending/rejected accounts with a new `AccountNotApprovedException` (403). A new `AdminPartnerController` (`/api/admin/partners`) lists pending accounts and approves/rejects them. On the frontend, a new partner sign-up page posts to the new endpoint, and the existing (currently mock-data-only) `admin-approvals` page is rewired to the real endpoints.

**Tech Stack:** Java 17 / Spring Boot 3.5 / Spring Data JPA / Spring Security (backend, `backend/`), Angular 21 zoneless / signals / HttpClient (frontend, `frontend/`).

## Global Constraints

- All new endpoints return the existing `ApiResponse<T>` envelope and route errors through `GlobalExceptionHandler` with a new error code, exactly like existing exceptions (`DuplicateResourceException` → 409, `ResourceNotFoundException` → 404, `InvalidRequestException` → 400).
- Existing traveler self-registration (`UserServiceImpl.register`) and admin-created accounts (`UserServiceImpl.createByAdmin`) must keep working unchanged — `status` defaults to `APPROVED` at the entity level, no code change needed in those two methods.
- Any new frontend component that fetches a list must store it in `signal<T[]>([])` and update via `.set(...)` — this app has no `zone.js` (Angular 21 zoneless); mutating a plain array (e.g. `.splice(...)`) does not trigger a re-render (this was the exact bug just fixed in `admin-users.ts`).
- Partner sign-up captures only name/email/phone/password/security-question/answer/role — no business-profile fields (business name, address, GST, documents). Out of scope per the design spec.
- No email/SMS notifications on approval/rejection. Out of scope per the design spec.

---

### Task 1: Data model — `ApprovalStatus` + `User.status`

**Files:**
- Create: `backend/src/main/java/com/travelease/backend/auth/entity/ApprovalStatus.java`
- Modify: `backend/src/main/java/com/travelease/backend/auth/entity/User.java`
- Modify: `backend/src/main/resources/seed_data.sql:562-570`
- Test: `backend/src/test/java/com/travelease/backend/auth/service/UserServiceImplTest.java`

**Interfaces:**
- Produces: `ApprovalStatus` enum with values `PENDING`, `APPROVED`, `REJECTED`. `User.getStatus()` / `User.setStatus(ApprovalStatus)` (Lombok `@Getter`/`@Setter` already on the class), defaulting to `ApprovalStatus.APPROVED`.

- [ ] **Step 1: Write the failing test**

Add to `UserServiceImplTest.java` (needs `import com.travelease.backend.auth.entity.ApprovalStatus;` added to the existing import block):

```java
@Test
void registerDefaultsToApprovedStatus() {
    RegisterRequest request = new RegisterRequest(
            "Asha",
            "asha@example.com",
            "9999999999",
            "Passw0rd1",
            "What is the name of the hospital where you were born?",
            "City General"
    );
    when(userRepository.existsByEmail("asha@example.com")).thenReturn(false);
    when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

    userService.register(request);

    ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
    verify(userRepository).save(captor.capture());
    assertThat(captor.getValue().getStatus()).isEqualTo(ApprovalStatus.APPROVED);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./mvnw test -Dtest=UserServiceImplTest#registerDefaultsToApprovedStatus`
Expected: FAIL with a compilation error — `ApprovalStatus` and `User.getStatus()` do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `backend/src/main/java/com/travelease/backend/auth/entity/ApprovalStatus.java`:

```java
package com.travelease.backend.auth.entity;

public enum ApprovalStatus {
    PENDING,
    APPROVED,
    REJECTED
}
```

Modify `User.java` — add the field after `providerId` (imports for `Enumerated`/`EnumType`/`Column` already exist on the class):

```java
    /**
     * Defaults to APPROVED so existing traveler self-registration and
     * admin-created accounts are unaffected. Only partner self-registration
     * (registerPartner) explicitly sets this to PENDING.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApprovalStatus status = ApprovalStatus.APPROVED;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./mvnw test -Dtest=UserServiceImplTest#registerDefaultsToApprovedStatus`
Expected: PASS

- [ ] **Step 5: Update seed data and verify the full suite still boots**

`seed_data.sql`'s `INSERT INTO users` is raw SQL — it bypasses the Java field default entirely, so the new `NOT NULL` column needs an explicit value there. Modify `backend/src/main/resources/seed_data.sql:562-570`:

```sql
INSERT INTO users (user_id, name, email, phone, password_hash, role, provider_id, status, security_question, security_answer_hash, created_at, updated_at) VALUES
('44444444-4444-4444-4444-444444444444', 'System Admin', 'admin@travelease.com', '9999900001', '$2a$10$PTatZMsZe.8Uq9FYlGVxEuQFlRq6IOJJWj9bb9jnCxGDDJ9TYxSFG', 'ROLE_ADMIN', NULL, 'APPROVED', 'What is your birth hospital?', '$2a$10$uUF4xsKQ0rI0J9L4xslBLO4nH7LbYd8ReLt4c5hd1tz9GmYTsYz0e', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('55555555-5555-5555-5555-555555555555', 'Priya Nair', 'traveler@travelease.com', '9999900002', '$2a$10$LKPljvx/NXnDyWf5ZlzEw.HOzVIo./fRTXrwGdJXkE90xJ0IEAPlC', 'ROLE_TRAVELER', NULL, 'APPROVED', 'What is your birth hospital?', '$2a$10$uUF4xsKQ0rI0J9L4xslBLO4nH7LbYd8ReLt4c5hd1tz9GmYTsYz0e', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('66666666-6666-6666-6666-666666666666', 'Sharma Travels Owner', 'provider1@travelease.com', '9999900003', '$2a$10$6sV0MN6YKyr1GSmVdt4SqOn.rDjIj.DbIVaqUT49nrlVpQLzDz7/O', 'ROLE_PROVIDER', 1, 'APPROVED', 'What is your birth hospital?', '$2a$10$uUF4xsKQ0rI0J9L4xslBLO4nH7LbYd8ReLt4c5hd1tz9GmYTsYz0e', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('77777777-7777-7777-7777-777777777777', 'Metro Express Owner', 'provider2@travelease.com', '9999900004', '$2a$10$QsDEbXY9AJjVrxdVu0afZeoy5omnxvmU.5Ys56VsgA3ep.u9R4n46', 'ROLE_PROVIDER', 2, 'APPROVED', 'What is your birth hospital?', '$2a$10$uUF4xsKQ0rI0J9L4xslBLO4nH7LbYd8ReLt4c5hd1tz9GmYTsYz0e', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e1000000-0000-0000-0000-000000000001', 'Grand Palace Hotels Owner', 'hotelprovider1@travelease.com', '9999900005', '$2a$10$IJDaiKMaNc5M1MBR28XbU.CQmw0yga.pKlJMMrbwruqbn2XqR/9JS', 'ROLE_HOTEL_PROVIDER', 101, 'APPROVED', 'What is your birth hospital?', '$2a$10$uUF4xsKQ0rI0J9L4xslBLO4nH7LbYd8ReLt4c5hd1tz9GmYTsYz0e', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('e1000000-0000-0000-0000-000000000002', 'Coastal Stays Owner', 'hotelprovider2@travelease.com', '9999900006', '$2a$10$VtU3P1q94slg1MuCa4mZ5ObmdQ5V648HI.LE52ndMx6nMYj.cH306', 'ROLE_HOTEL_PROVIDER', 102, 'APPROVED', 'What is your birth hospital?', '$2a$10$uUF4xsKQ0rI0J9L4xslBLO4nH7LbYd8ReLt4c5hd1tz9GmYTsYz0e', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('f1000000-0000-0000-0000-000000000001', 'Mumbai Adventures Owner', 'activityprovider1@travelease.com', '9999900007', '$2a$10$hbk0pveqX5qgbF81vFPivuAsu6W48GM85H8h.c625He3a3Aiue3PG', 'ROLE_ACTIVITY_PROVIDER', 201, 'APPROVED', 'What is your birth hospital?', '$2a$10$uUF4xsKQ0rI0J9L4xslBLO4nH7LbYd8ReLt4c5hd1tz9GmYTsYz0e', '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
('f1000000-0000-0000-0000-000000000002', 'Goa Watersports Owner', 'activityprovider2@travelease.com', '9999900008', '$2a$10$Lw2akz9Apgz/IfVAGWdRt.tmFY9cyemWPM1DbFugcQ8sNK37KC9jW', 'ROLE_ACTIVITY_PROVIDER', 202, 'APPROVED', 'What is your birth hospital?', '$2a$10$uUF4xsKQ0rI0J9L4xslBLO4nH7LbYd8ReLt4c5hd1tz9GmYTsYz0e', '2026-01-01 09:00:00', '2026-01-01 09:00:00');
```

(Only the column list and each row gained a `'APPROVED'` value — no other values changed.)

Run: `cd backend && ./mvnw test`
Expected: PASS (full suite, including `AuthFlowIntegrationTest`, which boots the full Spring context and would fail to start if seeding broke).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/travelease/backend/auth/entity/ApprovalStatus.java backend/src/main/java/com/travelease/backend/auth/entity/User.java backend/src/main/resources/seed_data.sql backend/src/test/java/com/travelease/backend/auth/service/UserServiceImplTest.java
git commit -m "feat: add ApprovalStatus to User, defaulting to APPROVED"
```

---

### Task 2: Login status gating

**Files:**
- Create: `backend/src/main/java/com/travelease/backend/shared/exception/AccountNotApprovedException.java`
- Modify: `backend/src/main/java/com/travelease/backend/shared/exception/GlobalExceptionHandler.java`
- Modify: `backend/src/main/java/com/travelease/backend/auth/service/AuthServiceImpl.java`
- Test: `backend/src/test/java/com/travelease/backend/auth/service/AuthServiceImplTest.java`

**Interfaces:**
- Consumes: `User.getStatus()` / `ApprovalStatus` from Task 1.
- Produces: `AccountNotApprovedException(String message)`, mapped by `GlobalExceptionHandler` to HTTP 403 with error code `ACCOUNT_NOT_APPROVED`.

- [ ] **Step 1: Write the failing test**

Add to `AuthServiceImplTest.java` (add `import com.travelease.backend.auth.entity.ApprovalStatus;` and `import com.travelease.backend.shared.exception.AccountNotApprovedException;` to the imports):

```java
@Test
void loginRejectsPendingPartnerAccount() {
    User user = existingUser();
    user.setStatus(ApprovalStatus.PENDING);
    when(userRepository.findByEmail("asha@example.com")).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("Passw0rd1", "hashed-password")).thenReturn(true);

    assertThatThrownBy(() -> authService.login(new LoginRequest("asha@example.com", "Passw0rd1")))
            .isInstanceOf(AccountNotApprovedException.class)
            .hasMessage("Your partner account is awaiting admin approval");
}

@Test
void loginRejectsRejectedPartnerAccount() {
    User user = existingUser();
    user.setStatus(ApprovalStatus.REJECTED);
    when(userRepository.findByEmail("asha@example.com")).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("Passw0rd1", "hashed-password")).thenReturn(true);

    assertThatThrownBy(() -> authService.login(new LoginRequest("asha@example.com", "Passw0rd1")))
            .isInstanceOf(AccountNotApprovedException.class)
            .hasMessage("Your partner application was rejected");
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./mvnw test -Dtest=AuthServiceImplTest`
Expected: FAIL with a compilation error — `AccountNotApprovedException` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `backend/src/main/java/com/travelease/backend/shared/exception/AccountNotApprovedException.java`:

```java
package com.travelease.backend.shared.exception;

public class AccountNotApprovedException extends RuntimeException {
    public AccountNotApprovedException(String message) {
        super(message);
    }
}
```

Add to `GlobalExceptionHandler.java`, right after `handleInvalidCredentials`:

```java
    @ExceptionHandler(AccountNotApprovedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccountNotApproved(AccountNotApprovedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error("ACCOUNT_NOT_APPROVED", ex.getMessage()));
    }
```

Modify `AuthServiceImpl.java` — add imports `com.travelease.backend.auth.entity.ApprovalStatus` and `com.travelease.backend.shared.exception.AccountNotApprovedException`, then update `login`:

```java
    @Override
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        if (user.getStatus() == ApprovalStatus.PENDING) {
            throw new AccountNotApprovedException("Your partner account is awaiting admin approval");
        }
        if (user.getStatus() == ApprovalStatus.REJECTED) {
            throw new AccountNotApprovedException("Your partner application was rejected");
        }

        String token = jwtService.generateToken(user.getEmail());
        UserResponse userResponse = new UserResponse(
                user.getId(), user.getName(), user.getEmail(), user.getPhone(), user.getRole().name(), user.getProviderId()
        );
        return new LoginResponse(token, userResponse);
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./mvnw test -Dtest=AuthServiceImplTest`
Expected: PASS (all 6 tests, including the 4 pre-existing ones — `existingUser()` doesn't set `status`, but the field defaults to `APPROVED` per Task 1, so those are unaffected).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/travelease/backend/shared/exception/AccountNotApprovedException.java backend/src/main/java/com/travelease/backend/shared/exception/GlobalExceptionHandler.java backend/src/main/java/com/travelease/backend/auth/service/AuthServiceImpl.java backend/src/test/java/com/travelease/backend/auth/service/AuthServiceImplTest.java
git commit -m "feat: block login for pending or rejected partner accounts"
```

**Note — no frontend change needed for this task:** `login.ts`'s `onSubmit` catch block already extracts `err.error?.error?.message` from any `HttpErrorResponse` and displays it verbatim (see `login.spec.ts`'s `'shows the backend error message and does not navigate on a failed login'` test, which proves this is code/message-agnostic — it isn't wired to `INVALID_CREDENTIALS` specifically). Once this task ships, a pending/rejected partner's login attempt surfaces `"Your partner account is awaiting admin approval"` / `"Your partner application was rejected"` automatically, with no additional frontend work.

---

### Task 3: Partner self-registration endpoint

**Files:**
- Create: `backend/src/main/java/com/travelease/backend/auth/dto/PartnerRegisterRequest.java`
- Modify: `backend/src/main/java/com/travelease/backend/auth/service/UserService.java`
- Modify: `backend/src/main/java/com/travelease/backend/auth/service/UserServiceImpl.java`
- Modify: `backend/src/main/java/com/travelease/backend/auth/controller/AuthController.java`
- Modify: `backend/src/main/java/com/travelease/backend/shared/config/SecurityConfig.java`
- Test: `backend/src/test/java/com/travelease/backend/auth/service/UserServiceImplTest.java`
- Test: `backend/src/test/java/com/travelease/backend/auth/controller/AuthFlowIntegrationTest.java`

**Interfaces:**
- Consumes: `ApprovalStatus` (Task 1), `AccountNotApprovedException` via login gating (Task 2).
- Produces: `UserService.registerPartner(PartnerRegisterRequest): UserResponse`. `POST /api/auth/register/partner` (public).

- [ ] **Step 1: Write the failing tests**

Add to `UserServiceImplTest.java` (add `import com.travelease.backend.auth.dto.PartnerRegisterRequest;` and `import com.travelease.backend.shared.exception.InvalidRequestException;`):

```java
@Test
void registerPartnerCreatesPendingProviderAccount() {
    PartnerRegisterRequest request = new PartnerRegisterRequest(
            "Priya", "priya@example.com", "9999999999", "Passw0rd1", "HOTEL_PROVIDER",
            "What is the name of the hospital where you were born?", "City General");
    when(userRepository.existsByEmail("priya@example.com")).thenReturn(false);
    when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

    UserResponse response = userService.registerPartner(request);

    ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
    verify(userRepository).save(captor.capture());
    assertThat(captor.getValue().getStatus()).isEqualTo(ApprovalStatus.PENDING);
    assertThat(captor.getValue().getRole()).isEqualTo(Role.ROLE_HOTEL_PROVIDER);
    assertThat(response.role()).isEqualTo(Role.ROLE_HOTEL_PROVIDER.name());
}

@Test
void registerPartnerRejectsNonProviderRole() {
    PartnerRegisterRequest request = new PartnerRegisterRequest(
            "Priya", "priya@example.com", "9999999999", "Passw0rd1", "TRAVELER",
            "What is the name of the hospital where you were born?", "City General");
    when(userRepository.existsByEmail("priya@example.com")).thenReturn(false);

    assertThatThrownBy(() -> userService.registerPartner(request))
            .isInstanceOf(InvalidRequestException.class);
}

@Test
void registerPartnerRejectsDuplicateEmail() {
    PartnerRegisterRequest request = new PartnerRegisterRequest(
            "Priya", "priya@example.com", "9999999999", "Passw0rd1", "HOTEL_PROVIDER",
            "What is the name of the hospital where you were born?", "City General");
    when(userRepository.existsByEmail("priya@example.com")).thenReturn(true);

    assertThatThrownBy(() -> userService.registerPartner(request))
            .isInstanceOf(DuplicateResourceException.class);
}
```

Add to `AuthFlowIntegrationTest.java` (add `import com.travelease.backend.auth.dto.PartnerRegisterRequest;`):

```java
@Test
void partnerRegistrationStartsPendingAndBlocksLoginUntilApproved() {
    PartnerRegisterRequest registerRequest = new PartnerRegisterRequest(
            "Priya Partner", "priya-partner@example.com", "9999999999", "Passw0rd1",
            "HOTEL_PROVIDER", "What is your birth hospital?", "City General");
    ResponseEntity<ApiResponse> registerResponse =
            restTemplate.postForEntity("/api/auth/register/partner", registerRequest, ApiResponse.class);
    assertThat(registerResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);

    LoginRequest loginRequest = new LoginRequest("priya-partner@example.com", "Passw0rd1");
    ResponseEntity<ApiResponse> loginResponse =
            restTemplate.postForEntity("/api/auth/login", loginRequest, ApiResponse.class);

    assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(loginResponse.getBody().error().code()).isEqualTo("ACCOUNT_NOT_APPROVED");
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && ./mvnw test -Dtest=UserServiceImplTest,AuthFlowIntegrationTest`
Expected: FAIL with a compilation error — `PartnerRegisterRequest` and `UserService.registerPartner` do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `backend/src/main/java/com/travelease/backend/auth/dto/PartnerRegisterRequest.java`:

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
        String email,

        @NotBlank(message = "phone is required")
        String phone,

        @NotBlank(message = "password is required")
        @Size(min = 8, message = "password must be at least 8 characters")
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$",
                message = "password must contain at least one letter and one digit"
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

Modify `UserService.java` — add to the interface:

```java
    UserResponse registerPartner(PartnerRegisterRequest request);
```

(add `import com.travelease.backend.auth.dto.PartnerRegisterRequest;`)

Modify `UserServiceImpl.java` — add the `PROVIDER_ROLES` constant and the method (add imports `com.travelease.backend.auth.dto.PartnerRegisterRequest`, `com.travelease.backend.auth.entity.ApprovalStatus`, `com.travelease.backend.shared.exception.InvalidRequestException`):

```java
    private static final List<Role> PROVIDER_ROLES =
            List.of(Role.ROLE_PROVIDER, Role.ROLE_HOTEL_PROVIDER, Role.ROLE_ACTIVITY_PROVIDER);

    @Override
    @Transactional
    public UserResponse registerPartner(PartnerRegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("Email is already registered: " + request.email());
        }

        Role role = mapRole(request.role());
        if (!PROVIDER_ROLES.contains(role)) {
            throw new InvalidRequestException("role must be one of PROVIDER, HOTEL_PROVIDER, ACTIVITY_PROVIDER");
        }

        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPhone(request.phone());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setSecurityQuestion(request.securityQuestion());
        user.setSecurityAnswerHash(passwordEncoder.encode(request.securityAnswer()));
        user.setRole(role);
        user.setStatus(ApprovalStatus.PENDING);

        User saved = userRepository.save(user);
        return toResponse(saved);
    }
```

Modify `AuthController.java` — add `import com.travelease.backend.auth.dto.PartnerRegisterRequest;` and the endpoint, right after `register`:

```java
    @PostMapping("/register/partner")
    @Operation(summary = "Register a new partner (provider) account", description = "ACCESS: PUBLIC\nSCOPE: Creates a hotel/transport/activity provider account pending admin approval.\nIDENTITY: No JWT is required.")
    public ResponseEntity<ApiResponse<UserResponse>> registerPartner(@Valid @RequestBody PartnerRegisterRequest request) {
        UserResponse user = userService.registerPartner(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(user, "Partner application submitted and awaiting admin approval"));
    }
```

Modify `SecurityConfig.java:53-56` — add the new path to the existing `permitAll` matcher:

```java
                    auth.requestMatchers(
                            "/api/auth/register", "/api/auth/register/partner", "/api/auth/login", "/health", "/h2-console/**",
                            "/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/error"
                    ).permitAll();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && ./mvnw test -Dtest=UserServiceImplTest,AuthFlowIntegrationTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/travelease/backend/auth/dto/PartnerRegisterRequest.java backend/src/main/java/com/travelease/backend/auth/service/UserService.java backend/src/main/java/com/travelease/backend/auth/service/UserServiceImpl.java backend/src/main/java/com/travelease/backend/auth/controller/AuthController.java backend/src/main/java/com/travelease/backend/shared/config/SecurityConfig.java backend/src/test/java/com/travelease/backend/auth/service/UserServiceImplTest.java backend/src/test/java/com/travelease/backend/auth/controller/AuthFlowIntegrationTest.java
git commit -m "feat: add public partner self-registration endpoint"
```

---

### Task 4: Admin pending list + approve/reject endpoints

**Files:**
- Create: `backend/src/main/java/com/travelease/backend/auth/dto/PendingPartnerResponse.java`
- Create: `backend/src/main/java/com/travelease/backend/auth/controller/AdminPartnerController.java`
- Modify: `backend/src/main/java/com/travelease/backend/auth/repository/UserRepository.java`
- Modify: `backend/src/main/java/com/travelease/backend/auth/service/UserService.java`
- Modify: `backend/src/main/java/com/travelease/backend/auth/service/UserServiceImpl.java`
- Test: `backend/src/test/java/com/travelease/backend/auth/service/UserServiceImplTest.java`
- Test: `backend/src/test/java/com/travelease/backend/auth/controller/AuthFlowIntegrationTest.java`

**Interfaces:**
- Consumes: `PROVIDER_ROLES`, `ApprovalStatus` (Task 3, Task 1).
- Produces: `UserService.listPendingPartners(): List<PendingPartnerResponse>`, `UserService.approvePartner(UUID): UserResponse`, `UserService.rejectPartner(UUID): UserResponse`. `GET /api/admin/partners/pending`, `PUT /api/admin/partners/{id}/approve`, `PUT /api/admin/partners/{id}/reject` (all `hasRole('ADMIN')`).

- [ ] **Step 1: Write the failing tests**

Add to `UserServiceImplTest.java` (add `import com.travelease.backend.auth.dto.PendingPartnerResponse;` and `import java.time.LocalDateTime;`):

```java
@Test
void listPendingPartnersReturnsOnlyPendingProviderAccounts() {
    User hotelPartner = new User();
    hotelPartner.setId(UUID.fromString("11111111-1111-1111-1111-111111111111"));
    hotelPartner.setName("Hotel Partner");
    hotelPartner.setEmail("hotel@example.com");
    hotelPartner.setRole(Role.ROLE_HOTEL_PROVIDER);
    hotelPartner.setStatus(ApprovalStatus.PENDING);
    hotelPartner.setCreatedAt(LocalDateTime.of(2026, 7, 1, 9, 0));
    when(userRepository.findByStatusAndRoleIn(eq(ApprovalStatus.PENDING), any()))
            .thenReturn(List.of(hotelPartner));

    List<PendingPartnerResponse> responses = userService.listPendingPartners();

    assertThat(responses).hasSize(1);
    assertThat(responses.get(0).email()).isEqualTo("hotel@example.com");
    assertThat(responses.get(0).role()).isEqualTo(Role.ROLE_HOTEL_PROVIDER.name());
}

@Test
void approvePartnerSetsStatusApproved() {
    User pending = new User();
    pending.setId(UUID.fromString("11111111-1111-1111-1111-111111111111"));
    pending.setRole(Role.ROLE_HOTEL_PROVIDER);
    pending.setStatus(ApprovalStatus.PENDING);
    when(userRepository.findById(pending.getId())).thenReturn(Optional.of(pending));
    when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

    UserResponse response = userService.approvePartner(pending.getId());

    assertThat(response.role()).isEqualTo(Role.ROLE_HOTEL_PROVIDER.name());
    ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
    verify(userRepository).save(captor.capture());
    assertThat(captor.getValue().getStatus()).isEqualTo(ApprovalStatus.APPROVED);
}

@Test
void rejectPartnerSetsStatusRejected() {
    User pending = new User();
    pending.setId(UUID.fromString("22222222-2222-2222-2222-222222222222"));
    pending.setRole(Role.ROLE_PROVIDER);
    pending.setStatus(ApprovalStatus.PENDING);
    when(userRepository.findById(pending.getId())).thenReturn(Optional.of(pending));
    when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

    userService.rejectPartner(pending.getId());

    ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
    verify(userRepository).save(captor.capture());
    assertThat(captor.getValue().getStatus()).isEqualTo(ApprovalStatus.REJECTED);
}

@Test
void approvePartnerThrowsWhenUserNotFound() {
    UUID id = UUID.fromString("33333333-3333-3333-3333-333333333333");
    when(userRepository.findById(id)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.approvePartner(id))
            .isInstanceOf(ResourceNotFoundException.class);
}

@Test
void approvePartnerThrowsWhenUserIsNotAPendingProvider() {
    User traveler = new User();
    traveler.setId(UUID.fromString("44444444-4444-4444-4444-444444444444"));
    traveler.setRole(Role.ROLE_TRAVELER);
    traveler.setStatus(ApprovalStatus.APPROVED);
    when(userRepository.findById(traveler.getId())).thenReturn(Optional.of(traveler));

    assertThatThrownBy(() -> userService.approvePartner(traveler.getId()))
            .isInstanceOf(InvalidRequestException.class);
}
```

Add to `AuthFlowIntegrationTest.java` (add `import java.util.List;`):

```java
@Test
void adminApprovesPendingPartnerAllowingLogin() {
    PartnerRegisterRequest registerRequest = new PartnerRegisterRequest(
            "Priya Partner", "priya-approve@example.com", "9999999999", "Passw0rd1",
            "HOTEL_PROVIDER", "What is your birth hospital?", "City General");
    restTemplate.postForEntity("/api/auth/register/partner", registerRequest, ApiResponse.class);

    String adminToken = loginAndGetToken("admin@travelease.test", "password123");
    HttpHeaders adminHeaders = new HttpHeaders();
    adminHeaders.setBearerAuth(adminToken);

    ResponseEntity<ApiResponse> pendingResponse = restTemplate.exchange(
            "/api/admin/partners/pending", HttpMethod.GET, new HttpEntity<>(adminHeaders), ApiResponse.class);
    assertThat(pendingResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

    @SuppressWarnings("unchecked")
    List<Map<String, Object>> pending = (List<Map<String, Object>>) pendingResponse.getBody().data();
    String partnerId = pending.stream()
            .filter(p -> "priya-approve@example.com".equals(p.get("email")))
            .findFirst().orElseThrow().get("id").toString();

    ResponseEntity<ApiResponse> approveResponse = restTemplate.exchange(
            "/api/admin/partners/" + partnerId + "/approve", HttpMethod.PUT, new HttpEntity<>(adminHeaders), ApiResponse.class);
    assertThat(approveResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

    LoginRequest loginRequest = new LoginRequest("priya-approve@example.com", "Passw0rd1");
    ResponseEntity<ApiResponse> loginResponse = restTemplate.postForEntity("/api/auth/login", loginRequest, ApiResponse.class);
    assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
}

private String loginAndGetToken(String email, String password) {
    LoginRequest loginRequest = new LoginRequest(email, password);
    ResponseEntity<ApiResponse> loginResponse = restTemplate.postForEntity("/api/auth/login", loginRequest, ApiResponse.class);
    @SuppressWarnings("unchecked")
    Map<String, Object> data = (Map<String, Object>) loginResponse.getBody().data();
    return (String) data.get("accessToken");
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && ./mvnw test -Dtest=UserServiceImplTest,AuthFlowIntegrationTest`
Expected: FAIL with a compilation error — `PendingPartnerResponse`, `UserRepository.findByStatusAndRoleIn`, `listPendingPartners`/`approvePartner`/`rejectPartner`, and `/api/admin/partners/**` do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `backend/src/main/java/com/travelease/backend/auth/dto/PendingPartnerResponse.java`:

```java
package com.travelease.backend.auth.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record PendingPartnerResponse(UUID id, String name, String email, String role, LocalDateTime createdAt) {
}
```

Modify `UserRepository.java` — add (needs `import com.travelease.backend.auth.entity.ApprovalStatus;`):

```java
    List<User> findByStatusAndRoleIn(ApprovalStatus status, List<Role> roles);
```

Modify `UserService.java` — add to the interface (needs `import com.travelease.backend.auth.dto.PendingPartnerResponse;` and `import java.util.UUID;`):

```java
    List<PendingPartnerResponse> listPendingPartners();

    UserResponse approvePartner(UUID id);

    UserResponse rejectPartner(UUID id);
```

Modify `UserServiceImpl.java` — add (needs `import com.travelease.backend.auth.dto.PendingPartnerResponse;` and `import java.util.UUID;`):

```java
    @Override
    public List<PendingPartnerResponse> listPendingPartners() {
        return userRepository.findByStatusAndRoleIn(ApprovalStatus.PENDING, PROVIDER_ROLES).stream()
                .map(u -> new PendingPartnerResponse(u.getId(), u.getName(), u.getEmail(), u.getRole().name(), u.getCreatedAt()))
                .sorted(Comparator.comparing(PendingPartnerResponse::createdAt))
                .toList();
    }

    @Override
    @Transactional
    public UserResponse approvePartner(UUID id) {
        User user = findPendingPartnerOrThrow(id);
        user.setStatus(ApprovalStatus.APPROVED);
        return toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse rejectPartner(UUID id) {
        User user = findPendingPartnerOrThrow(id);
        user.setStatus(ApprovalStatus.REJECTED);
        return toResponse(userRepository.save(user));
    }

    private User findPendingPartnerOrThrow(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        if (!PROVIDER_ROLES.contains(user.getRole()) || user.getStatus() != ApprovalStatus.PENDING) {
            throw new InvalidRequestException("User is not a pending partner application");
        }
        return user;
    }
```

Create `backend/src/main/java/com/travelease/backend/auth/controller/AdminPartnerController.java`:

```java
package com.travelease.backend.auth.controller;

import com.travelease.backend.auth.dto.PendingPartnerResponse;
import com.travelease.backend.auth.dto.UserResponse;
import com.travelease.backend.auth.service.UserService;
import com.travelease.backend.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/partners")
@RequiredArgsConstructor
@Tag(name = "Admin Users", description = "Admin-only partner approval endpoints")
public class AdminPartnerController {

    private final UserService userService;

    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List pending partner applications", description = "ACCESS: ADMIN\nSCOPE: Returns provider-role accounts awaiting approval.")
    public ResponseEntity<ApiResponse<List<PendingPartnerResponse>>> listPending() {
        return ResponseEntity.ok(ApiResponse.success(userService.listPendingPartners(), "Pending partners retrieved"));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Approve a pending partner application", description = "ACCESS: ADMIN\nSCOPE: Sets the partner account status to APPROVED, allowing login.")
    public ResponseEntity<ApiResponse<UserResponse>> approve(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(userService.approvePartner(id), "Partner approved"));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Reject a pending partner application", description = "ACCESS: ADMIN\nSCOPE: Sets the partner account status to REJECTED, blocking login.")
    public ResponseEntity<ApiResponse<UserResponse>> reject(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(userService.rejectPartner(id), "Partner rejected"));
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && ./mvnw test -Dtest=UserServiceImplTest,AuthFlowIntegrationTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/travelease/backend/auth/dto/PendingPartnerResponse.java backend/src/main/java/com/travelease/backend/auth/controller/AdminPartnerController.java backend/src/main/java/com/travelease/backend/auth/repository/UserRepository.java backend/src/main/java/com/travelease/backend/auth/service/UserService.java backend/src/main/java/com/travelease/backend/auth/service/UserServiceImpl.java backend/src/test/java/com/travelease/backend/auth/service/UserServiceImplTest.java backend/src/test/java/com/travelease/backend/auth/controller/AuthFlowIntegrationTest.java
git commit -m "feat: add admin endpoints to list and approve/reject pending partners"
```

---

### Task 5: Frontend partner sign-up page

**Files:**
- Modify: `frontend/src/app/core/auth/auth.service.ts`
- Test: `frontend/src/app/core/auth/auth.service.spec.ts`
- Create: `frontend/src/app/features/auth/components/partner-register/partner-register.ts`
- Create: `frontend/src/app/features/auth/components/partner-register/partner-register.html`
- Test: `frontend/src/app/features/auth/components/partner-register/partner-register.spec.ts`
- Modify: `frontend/src/app/features/auth/auth.routes.ts`
- Modify: `frontend/src/app/features/auth/components/register/register.html`
- Modify: `frontend/src/app/features/auth/components/login/login.html`

**Interfaces:**
- Consumes: `API_BASE_URL`, `ApiResponse<T>` (existing).
- Produces: `AuthService.registerPartner(payload): Promise<void>`. `PartnerRegister` component routed at `/partner-register`.

- [ ] **Step 1: Write the failing test for `AuthService.registerPartner`**

Add to `auth.service.spec.ts`, inside the `describe('AuthService', ...)` block:

```ts
it('submits a partner registration to the partner endpoint', async () => {
  const { service, httpMock } = await setup();

  const registerPromise = service.registerPartner({
    name: 'Priya Partner',
    email: 'priya@example.com',
    phone: '9999999999',
    password: 'Passw0rd1',
    role: 'HOTEL_PROVIDER',
    securityQuestion: 'What is your birth hospital?',
    securityAnswer: 'City General',
  });

  const req = httpMock.expectOne('http://localhost:8080/api/auth/register/partner');
  expect(req.request.method).toBe('POST');
  expect(req.request.body.role).toBe('HOTEL_PROVIDER');
  req.flush({ success: true, data: { id: '1' }, message: 'Partner application submitted', error: null });

  await expect(registerPromise).resolves.toBeUndefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx ng test --watch=false --include='**/auth.service.spec.ts'`
Expected: FAIL with a compilation error — `AuthService.registerPartner` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Modify `auth.service.ts` — add this method to the `AuthService` class, after `register`:

```ts
  async registerPartner(payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: string;
    securityQuestion: string;
    securityAnswer: string;
  }): Promise<void> {
    await firstValueFrom(
      this.http.post<ApiResponse<unknown>>(`${API_BASE_URL}/api/auth/register/partner`, payload),
    );
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx ng test --watch=false --include='**/auth.service.spec.ts'`
Expected: PASS

- [ ] **Step 5: Write the failing test for the `PartnerRegister` component**

Create `frontend/src/app/features/auth/components/partner-register/partner-register.spec.ts`:

```ts
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
    (el.querySelector('#password') as HTMLInputElement).value = 'Passw0rd1';
    (el.querySelector('#confirmPassword') as HTMLInputElement).value = 'Passw0rd1';
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
    req.flush({ success: true, data: { id: '1' }, message: 'ok', error: null });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(fixture.componentInstance.success()).toContain('awaiting admin approval');
    http.verify();
  });
});
```

Note: `await new Promise((resolve) => setTimeout(resolve, 0))` is used here instead of `fixture.whenStable()` after `req.flush(...)` — in this zoneless test harness, `whenStable()` does not reliably wait for the microtask continuation of a DOM-event-triggered `async` handler wrapped in `firstValueFrom`; a macrotask flush does. (`auth.service.spec.ts`'s tests avoid this entirely by awaiting the service's returned promise directly instead of going through a component/DOM event.)

- [ ] **Step 6: Run test to verify it fails**

Run: `cd frontend && npx ng test --watch=false --include='**/partner-register.spec.ts'`
Expected: FAIL — `PartnerRegister` module does not exist yet.

- [ ] **Step 7: Write minimal implementation**

Create `frontend/src/app/features/auth/components/partner-register/partner-register.ts`:

```ts
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { AuthService } from '@app/core/auth/auth.service';

@Component({
  selector: 'app-partner-register',
  imports: [RouterLink, HlmButtonImports, HlmInputImports, HlmLabelImports],
  templateUrl: './partner-register.html',
})
export class PartnerRegister {
  private readonly authService = inject(AuthService);

  protected readonly error = signal<string | null>(null);
  public readonly success = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);
    this.success.set(null);
    this.submitting.set(true);

    try {
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

      if (password !== confirmPassword) {
        this.error.set('Passwords do not match.');
        return;
      }

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

Create `frontend/src/app/features/auth/components/partner-register/partner-register.html`:

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
      <input hlmInput id="name" name="name" placeholder="Jane Doe" />
    </div>
    <div class="space-y-2">
      <label hlmLabel for="phone">Phone</label>
      <input hlmInput id="phone" name="phone" placeholder="+91 9876543210" />
    </div>
  </div>
  <div class="space-y-2">
    <label hlmLabel for="email">Email</label>
    <input hlmInput id="email" name="email" type="email" placeholder="you@example.com" />
  </div>
  <div class="space-y-2">
    <label hlmLabel for="role">Partner type</label>
    <select
      id="role"
      name="role"
      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
    >
      <option value="HOTEL_PROVIDER">Hotel Provider</option>
      <option value="PROVIDER">Bus Provider</option>
      <option value="ACTIVITY_PROVIDER">Activity Provider</option>
    </select>
  </div>
  <div class="space-y-2">
    <label hlmLabel for="password">Password</label>
    <input hlmInput id="password" name="password" type="password" placeholder="At least 8 characters" />
  </div>
  <div class="space-y-2">
    <label hlmLabel for="confirmPassword">Confirm password</label>
    <input hlmInput id="confirmPassword" name="confirmPassword" type="password" />
  </div>
  <div class="space-y-2">
    <label hlmLabel for="securityQuestion">Security question</label>
    <input
      hlmInput
      id="securityQuestion"
      name="securityQuestion"
      value="What is the name of the hospital where you were born?"
      readonly
    />
  </div>
  <div class="space-y-2">
    <label hlmLabel for="securityAnswer">Your answer</label>
    <input hlmInput id="securityAnswer" name="securityAnswer" placeholder="Enter your answer" />
  </div>
  <button hlmBtn type="submit" class="w-full" [disabled]="submitting()">
    {{ submitting() ? 'Submitting...' : 'Submit application' }}
  </button>
</form>

<p class="text-sm text-muted-foreground mt-6 text-center">
  Not a partner? <a routerLink="/register" class="text-primary font-medium">Create a traveler account</a>
</p>
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd frontend && npx ng test --watch=false --include='**/partner-register.spec.ts'`
Expected: PASS

- [ ] **Step 9: Wire the route and add discovery links**

Modify `auth.routes.ts` — add a new child route to `AUTH_ROUTES`, after `register`:

```ts
      {
        path: 'partner-register',
        loadComponent: () =>
          import('@app/features/auth/components/partner-register/partner-register').then(
            (m) => m.PartnerRegister,
          ),
      },
```

Modify `register.html` — add after the closing `</form>`'s trailing `<p>` (the "Already have an account?" line):

```html
<p class="text-sm text-muted-foreground mt-2 text-center">
  Are you a hotel, transport or activity partner? <a routerLink="/partner-register" class="text-primary font-medium">Register your business</a>
</p>
```

Modify `login.html` — add after the trailing "Don't have an account?" `<p>`:

```html
<p class="text-sm text-muted-foreground mt-2 text-center">
  Want to become a partner? <a routerLink="/partner-register" class="text-primary font-medium">Apply here</a>
</p>
```

Run: `cd frontend && npx ng test --watch=false`
Expected: PASS (full suite — confirms the route/link additions didn't break `register.spec.ts` / `login.spec.ts`, if they assert exact DOM content).

- [ ] **Step 10: Commit**

```bash
git add frontend/src/app/core/auth/auth.service.ts frontend/src/app/core/auth/auth.service.spec.ts frontend/src/app/features/auth/components/partner-register frontend/src/app/features/auth/auth.routes.ts frontend/src/app/features/auth/components/register/register.html frontend/src/app/features/auth/components/login/login.html
git commit -m "feat: add partner self-registration page"
```

---

### Task 6: Wire `admin-approvals` to the real backend

**Files:**
- Modify: `frontend/src/app/features/admin/components/admin-approvals/admin-approvals.ts`
- Modify: `frontend/src/app/features/admin/components/admin-approvals/admin-approvals.html`
- Modify: `frontend/src/app/features/admin/components/admin-approvals/admin-approvals.spec.ts`

**Interfaces:**
- Consumes: `GET /api/admin/partners/pending`, `PUT /api/admin/partners/{id}/approve`, `PUT /api/admin/partners/{id}/reject` (Task 4).
- Produces: `AdminApprovals.approvals: Signal<PendingPartnerRow[]>`, `.pendingCount()/.hotelCount()/.transportCount()/.activityCount()` as `computed()` signals, `.approve(id)/.reject(id)` methods. `iconForApprovalType` export is kept (existing consumers/tests rely on it).

- [ ] **Step 1: Write the failing tests**

Replace `admin-approvals.spec.ts` entirely with:

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { lucideActivity, lucideBus, lucideCheck, lucideHotel, lucideX } from '@ng-icons/lucide';
import { API_BASE_URL } from '@app/core/api/api-config';
import { AdminApprovals, iconForApprovalType } from '@app/features/admin/components/admin-approvals/admin-approvals';

describe('iconForApprovalType', () => {
  it('maps Hotel, Transport, and Activity to their icons', () => {
    expect(iconForApprovalType('Hotel')).toBe('lucideHotel');
    expect(iconForApprovalType('Transport')).toBe('lucideBus');
    expect(iconForApprovalType('Activity')).toBe('lucideActivity');
  });
});

describe('AdminApprovals', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [AdminApprovals],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideIcons({ lucideActivity, lucideBus, lucideCheck, lucideHotel, lucideX }),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminApprovals);
    const http = TestBed.inject(HttpTestingController);
    return { fixture, http };
  }

  const pendingResponse = {
    success: true,
    message: 'Pending partners retrieved',
    error: null,
    data: [
      { id: 'p1', name: 'Coral Reef Resort', email: 'coral@example.com', role: 'ROLE_HOTEL_PROVIDER', createdAt: '2026-06-08T09:00:00' },
      { id: 'p2', name: 'MountainLine Buses', email: 'mountainline@example.com', role: 'ROLE_PROVIDER', createdAt: '2026-06-10T09:00:00' },
    ],
  };

  it('loads pending partners and renders the stat counts and rows', async () => {
    const { fixture, http } = await setup();
    fixture.detectChanges();

    http.expectOne(`${API_BASE_URL}/api/admin/partners/pending`).flush(pendingResponse);
    fixture.detectChanges();

    const c = fixture.componentInstance;
    expect(c.pendingCount()).toBe(2);
    expect(c.hotelCount()).toBe(1);
    expect(c.transportCount()).toBe(1);
    expect(c.activityCount()).toBe(0);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Coral Reef Resort');
    expect(text).toContain('MountainLine Buses');

    http.verify();
  });

  it('approves a partner and removes it from the pending list', async () => {
    const { fixture, http } = await setup();
    fixture.detectChanges();
    http.expectOne(`${API_BASE_URL}/api/admin/partners/pending`).flush(pendingResponse);
    fixture.detectChanges();

    const approveButtons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).filter((b) => b.textContent?.includes('Approve'));
    approveButtons[0].dispatchEvent(new Event('click'));

    const approveReq = http.expectOne(`${API_BASE_URL}/api/admin/partners/p1/approve`);
    expect(approveReq.request.method).toBe('PUT');
    approveReq.flush({ success: true, data: null, message: 'Partner approved', error: null });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(fixture.componentInstance.approvals()).toHaveLength(1);
    expect(fixture.componentInstance.approvals()[0].id).toBe('p2');

    http.verify();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx ng test --watch=false --include='**/admin-approvals.spec.ts'`
Expected: FAIL — `AdminApprovals.pendingCount`/`hotelCount`/etc. are plain fields, not callable signals yet, and no HTTP request is made.

- [ ] **Step 3: Write minimal implementation**

Replace `admin-approvals.ts` entirely with:

```ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NgIcon } from '@ng-icons/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';

export function iconForApprovalType(type: string): string {
  if (type === 'Hotel') return 'lucideHotel';
  if (type === 'Transport') return 'lucideBus';
  return 'lucideActivity';
}

const ROLE_TYPE: Record<string, string> = {
  ROLE_HOTEL_PROVIDER: 'Hotel',
  ROLE_PROVIDER: 'Transport',
  ROLE_ACTIVITY_PROVIDER: 'Activity',
};

interface PendingPartnerDto {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface PendingPartnerRow {
  id: string;
  name: string;
  email: string;
  type: string;
  registered: string;
  icon: string;
}

@Component({
  selector: 'app-admin-approvals',
  imports: [NgIcon, HlmCardImports, HlmButtonImports, HlmBadgeImports, PageHeader],
  templateUrl: './admin-approvals.html',
})
export class AdminApprovals implements OnInit {
  private readonly http = inject(HttpClient);

  public readonly approvals = signal<PendingPartnerRow[]>([]);
  public readonly loading = signal(false);
  public readonly message = signal<string | null>(null);

  public readonly pendingCount = computed(() => this.approvals().length);
  public readonly hotelCount = computed(() => this.approvals().filter((p) => p.type === 'Hotel').length);
  public readonly transportCount = computed(() => this.approvals().filter((p) => p.type === 'Transport').length);
  public readonly activityCount = computed(() => this.approvals().filter((p) => p.type === 'Activity').length);

  ngOnInit(): void {
    void this.loadPending();
  }

  async approve(id: string): Promise<void> {
    await this.act(id, 'approve');
  }

  async reject(id: string): Promise<void> {
    await this.act(id, 'reject');
  }

  private async act(id: string, action: 'approve' | 'reject'): Promise<void> {
    try {
      await firstValueFrom(
        this.http.put<ApiResponse<unknown>>(`${API_BASE_URL}/api/admin/partners/${id}/${action}`, {}),
      );
      this.approvals.set(this.approvals().filter((p) => p.id !== id));
    } catch {
      this.message.set(`Unable to ${action} this partner right now.`);
    }
  }

  private async loadPending(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<PendingPartnerDto[]>>(`${API_BASE_URL}/api/admin/partners/pending`),
      );
      this.approvals.set((response.data ?? []).map((p) => {
        const type = ROLE_TYPE[p.role] ?? p.role;
        return {
          id: p.id,
          name: p.name,
          email: p.email,
          type,
          registered: p.createdAt.slice(0, 10),
          icon: iconForApprovalType(type),
        };
      }));
    } catch {
      this.message.set('Unable to load pending partners right now.');
    } finally {
      this.loading.set(false);
    }
  }
}
```

Replace `admin-approvals.html` entirely with:

```html
<app-page-header title="Partner Approvals" subtitle="Review and approve new hotel, transport and activity partner registrations." />

@if (message()) {
  <div class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive mb-4">
    {{ message() }}
  </div>
}

<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  <div hlmCard>
    <div hlmCardContent class="pt-5">
      <p class="text-xs text-muted-foreground">Pending</p>
      <p class="text-2xl font-semibold mt-1 tabular-nums">{{ pendingCount() }}</p>
    </div>
  </div>
  <div hlmCard>
    <div hlmCardContent class="pt-5">
      <p class="text-xs text-muted-foreground">Hotels</p>
      <p class="text-2xl font-semibold mt-1 tabular-nums">{{ hotelCount() }}</p>
    </div>
  </div>
  <div hlmCard>
    <div hlmCardContent class="pt-5">
      <p class="text-xs text-muted-foreground">Transport</p>
      <p class="text-2xl font-semibold mt-1 tabular-nums">{{ transportCount() }}</p>
    </div>
  </div>
  <div hlmCard>
    <div hlmCardContent class="pt-5">
      <p class="text-xs text-muted-foreground">Activity</p>
      <p class="text-2xl font-semibold mt-1 tabular-nums">{{ activityCount() }}</p>
    </div>
  </div>
</div>

<div hlmCard>
  <div hlmCardHeader>
    <h3 hlmCardTitle>Awaiting Review</h3>
  </div>
  <div hlmCardContent class="space-y-3">
    @for (p of approvals(); track p.id) {
      <div class="flex items-center gap-4 p-4 rounded-lg border bg-card">
        <div class="h-11 w-11 rounded-md bg-primary/10 text-primary grid place-items-center">
          <ng-icon [name]="p.icon" class="h-5 w-5" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="font-medium">{{ p.name }}</p>
            <span hlmBadge variant="outline">{{ p.type }}</span>
          </div>
          <p class="text-xs text-muted-foreground mt-0.5">{{ p.email }} · Registered {{ p.registered }}</p>
        </div>
        <button
          hlmBtn
          variant="outline"
          size="sm"
          class="text-destructive border-destructive/30 hover:bg-destructive/10"
          (click)="reject(p.id)"
        >
          <ng-icon name="lucideX" class="h-4 w-4 mr-1" />Reject
        </button>
        <button hlmBtn size="sm" class="bg-success text-success-foreground hover:bg-success/90" (click)="approve(p.id)">
          <ng-icon name="lucideCheck" class="h-4 w-4 mr-1" />Approve
        </button>
      </div>
    } @empty {
      <p class="text-sm text-muted-foreground py-4">No pending partner applications.</p>
    }
  </div>
</div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx ng test --watch=false --include='**/admin-approvals.spec.ts'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/admin/components/admin-approvals
git commit -m "feat: wire admin partner approvals page to the real backend"
```

## Final Verification

- [ ] Run the full backend suite: `cd backend && ./mvnw test` — expect PASS.
- [ ] Run the full frontend suite: `cd frontend && npx ng test --watch=false` — expect PASS.
