# Profile Update + Change Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an authenticated user update their name/phone from the Profile page and change their password (gated by their stored security question), backed by two new Spring Boot endpoints.

**Architecture:** Two new `AuthController` endpoints (`PUT /api/auth/me`, `POST /api/auth/change-password`) backed by two new `UserService` methods, following the existing `getByEmail`/`verifySecurityAnswer` patterns exactly. The frontend gets a new `ProfileService` (mirrors `AuthService`'s async/`firstValueFrom` style) and the `Profile` component is rewritten from static `[value]`-bound inputs into two template-driven forms (profile form + inline change-password form), matching `register.ts`/`login.ts` conventions (no Reactive Forms anywhere in this app).

**Tech Stack:** Java 17 / Spring Boot 3.5 / Spring Data JPA / jakarta.validation (backend, `backend/`), Angular (standalone components, signals, vitest via `@angular/build:unit-test`) (frontend, `frontend/`).

**Spec:** `docs/superpowers/specs/2026-07-09-profile-update-design.md`

## Global Constraints

- Email is **never** editable via these endpoints — it is the JWT principal. `UpdateProfileRequest` only carries `name` and `phone`.
- The security-answer check and the password update happen in **one** service call (`UserService.changePassword`) — never split into a separate "verify" call and a separate "update" call, to avoid a client-controlled bypass.
- A wrong security answer throws `InvalidRequestException` (existing class in `com.travelease.backend.shared.exception`), which `GlobalExceptionHandler` already maps to `400 BAD_REQUEST` — do not add a new exception type or handler.
- Do **not** add `securityQuestion` to the existing shared `UserResponse` record — it's returned by `listUsers`/`searchTravelers`/admin endpoints, and leaking every user's security question through those would be a new information disclosure. Use a dedicated `MeResponse` record instead, used only by `GET /api/auth/me` and `PUT /api/auth/me`.
- Frontend forms are template-driven (`<form (submit)>` + native `FormData`), never Angular Reactive Forms — this codebase has zero `FormGroup`/`Validators` usage and register/login both use the `FormData` pattern.
- No changes to `AuthService`/`StoredUser`/`localStorage` — the Profile page keeps independently fetching `/api/auth/me` rather than reading from global auth state.
- Remove the non-functional "Preferred city" input and "Travel preferences" panel from `profile.html` — no backend concept exists for either.

---

### Task 1: `GET /api/auth/me` returns a dedicated `MeResponse` (adds `securityQuestion`)

**Files:**
- Create: `backend/src/main/java/com/travelease/backend/auth/dto/MeResponse.java`
- Modify: `backend/src/main/java/com/travelease/backend/auth/controller/AuthController.java`
- Test: `backend/src/test/java/com/travelease/backend/auth/controller/AuthFlowIntegrationTest.java`

**Interfaces:**
- Produces: `MeResponse(UUID id, String name, String email, String phone, String role, Long providerId, String securityQuestion)` — a record in `auth/dto/`. `AuthController` gets a private `toMeResponse(User user)` helper that Task 2 also reuses.

- [ ] **Step 1: Update the existing `me` integration test to assert `securityQuestion` is present**

Edit `registerThenLoginThenMeWorksEndToEnd` in `AuthFlowIntegrationTest.java` — add this assertion right after the existing `assertThat(userData.get("email"))...` line:

```java
        assertThat(userData.get("securityQuestion")).isEqualTo("What is your birth hospital?");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && ./mvnw test -Dtest=AuthFlowIntegrationTest#registerThenLoginThenMeWorksEndToEnd`
Expected: FAIL — `userData.get("securityQuestion")` is `null`, assertion fails expecting `"What is your birth hospital?"`.

- [ ] **Step 3: Create `MeResponse`**

```java
package com.travelease.backend.auth.dto;

import java.util.UUID;

public record MeResponse(UUID id, String name, String email, String phone, String role, Long providerId, String securityQuestion) {
}
```

- [ ] **Step 4: Update `AuthController` to use `MeResponse` for `/me`**

In `AuthController.java`, add the import and replace the `me` method body:

```java
import com.travelease.backend.auth.dto.MeResponse;
```

```java
    @GetMapping("/me")
    @Operation(summary = "Get the current authenticated user", description = "ACCESS: AUTHENTICATED\nSCOPE: Returns the user resolved from the current JWT identity.\nIDENTITY: The authenticated email from the security context is used; no client-supplied userId is trusted.")
    public ResponseEntity<ApiResponse<MeResponse>> me(Authentication authentication) {
        User user = userService.getByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(toMeResponse(user), "Current user retrieved"));
    }

    private MeResponse toMeResponse(User user) {
        return new MeResponse(
                user.getId(), user.getName(), user.getEmail(), user.getPhone(),
                user.getRole().name(), user.getProviderId(), user.getSecurityQuestion()
        );
    }
```

Remove the now-unused `UserResponse response = new UserResponse(...)` block that this replaces (the old `me` method body). The `UserResponse` import in `AuthController.java` stays — it's still used by `register`/`registerPartner`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && ./mvnw test -Dtest=AuthFlowIntegrationTest#registerThenLoginThenMeWorksEndToEnd`
Expected: PASS

- [ ] **Step 6: Run the full auth test suite to check nothing else broke**

Run: `cd backend && ./mvnw test -Dtest=AuthFlowIntegrationTest,UserServiceImplTest,AuthServiceImplTest`
Expected: PASS (all tests green)

---

### Task 2: `PUT /api/auth/me` — update name and phone

**Files:**
- Create: `backend/src/main/java/com/travelease/backend/auth/dto/UpdateProfileRequest.java`
- Modify: `backend/src/main/java/com/travelease/backend/auth/service/UserService.java`
- Modify: `backend/src/main/java/com/travelease/backend/auth/service/UserServiceImpl.java`
- Modify: `backend/src/main/java/com/travelease/backend/auth/controller/AuthController.java`
- Test: `backend/src/test/java/com/travelease/backend/auth/service/UserServiceImplTest.java`
- Test: `backend/src/test/java/com/travelease/backend/auth/controller/AuthFlowIntegrationTest.java`

**Interfaces:**
- Consumes: `MeResponse` and `toMeResponse(User)` from Task 1 (same `AuthController`).
- Produces: `UserService.updateProfile(String email, String name, String phone): User` — Task 3 does not depend on this, but both live in the same `UserService`/`UserServiceImpl` files.

- [ ] **Step 1: Add failing unit tests to `UserServiceImplTest.java`**

Add these two tests inside the `UserServiceImplTest` class:

```java
    @Test
    void updateProfileUpdatesNameAndPhone() {
        User user = new User();
        user.setEmail("asha@example.com");
        user.setName("Asha");
        user.setPhone("9999999999");
        when(userRepository.findByEmail("asha@example.com")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User updated = userService.updateProfile("asha@example.com", "Asha Rao", "8888888888");

        assertThat(updated.getName()).isEqualTo("Asha Rao");
        assertThat(updated.getPhone()).isEqualTo("8888888888");
    }

    @Test
    void updateProfileThrowsWhenUserNotFound() {
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateProfile("missing@example.com", "Name", "123"))
                .isInstanceOf(ResourceNotFoundException.class);
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && ./mvnw test -Dtest=UserServiceImplTest#updateProfileUpdatesNameAndPhone+updateProfileThrowsWhenUserNotFound`
Expected: FAIL — compile error, `UserService.updateProfile` does not exist yet.

- [ ] **Step 3: Add `UpdateProfileRequest` DTO**

```java
package com.travelease.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank(message = "name is required")
        @Size(min = 2, max = 100, message = "name must be between 2 and 100 characters")
        String name,

        @NotBlank(message = "phone is required")
        String phone
) {
}
```

- [ ] **Step 4: Add `updateProfile` to `UserService` interface**

Add this method signature to `UserService.java` (below `verifySecurityAnswer`):

```java
    User updateProfile(String email, String name, String phone);
```

- [ ] **Step 5: Implement `updateProfile` in `UserServiceImpl`**

Add this method to `UserServiceImpl.java` (below `verifySecurityAnswer`):

```java
    @Override
    @Transactional
    public User updateProfile(String email, String name, String phone) {
        User user = getByEmail(email);
        user.setName(name);
        user.setPhone(phone);
        return userRepository.save(user);
    }
```

- [ ] **Step 6: Run the unit tests to verify they pass**

Run: `cd backend && ./mvnw test -Dtest=UserServiceImplTest`
Expected: PASS (all tests in the class, including the two new ones)

- [ ] **Step 7: Add a failing integration test for the endpoint**

Add to `AuthFlowIntegrationTest.java` (uses the existing `loginAndGetToken` helper):

```java
    @Test
    void updateProfileChangesNameAndPhoneForAuthenticatedUser() {
        RegisterRequest registerRequest = new RegisterRequest("Asha", "asha-update@example.com", "9999999999", "Passw0rd1", "What is your birth hospital?", "City General");
        restTemplate.postForEntity("/api/auth/register", registerRequest, ApiResponse.class);
        String token = loginAndGetToken("asha-update@example.com", "Passw0rd1");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        Map<String, String> updateBody = Map.of("name", "Asha Rao", "phone", "8888888888");
        ResponseEntity<ApiResponse> response = restTemplate.exchange(
                "/api/auth/me", HttpMethod.PUT, new HttpEntity<>(updateBody, headers), ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) response.getBody().data();
        assertThat(data.get("name")).isEqualTo("Asha Rao");
        assertThat(data.get("phone")).isEqualTo("8888888888");
    }

    @Test
    void updateProfileRejectsBlankName() {
        RegisterRequest registerRequest = new RegisterRequest("Asha", "asha-update-blank@example.com", "9999999999", "Passw0rd1", "What is your birth hospital?", "City General");
        restTemplate.postForEntity("/api/auth/register", registerRequest, ApiResponse.class);
        String token = loginAndGetToken("asha-update-blank@example.com", "Passw0rd1");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        Map<String, String> updateBody = Map.of("name", "", "phone", "8888888888");
        ResponseEntity<ApiResponse> response = restTemplate.exchange(
                "/api/auth/me", HttpMethod.PUT, new HttpEntity<>(updateBody, headers), ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
```

- [ ] **Step 8: Run the integration tests to verify they fail**

Run: `cd backend && ./mvnw test -Dtest=AuthFlowIntegrationTest#updateProfileChangesNameAndPhoneForAuthenticatedUser+updateProfileRejectsBlankName`
Expected: FAIL — 404, no `PUT /api/auth/me` mapping exists yet.

- [ ] **Step 9: Add the `PUT /me` endpoint to `AuthController`**

Add these imports:

```java
import com.travelease.backend.auth.dto.UpdateProfileRequest;
import org.springframework.web.bind.annotation.PutMapping;
```

Add this method (below `me`):

```java
    @PutMapping("/me")
    @Operation(summary = "Update the current authenticated user's profile", description = "ACCESS: AUTHENTICATED\nSCOPE: Updates name and phone for the user resolved from the current JWT identity.\nIDENTITY: The authenticated email from the security context is used; no client-supplied userId is trusted.")
    public ResponseEntity<ApiResponse<MeResponse>> updateMe(@Valid @RequestBody UpdateProfileRequest request, Authentication authentication) {
        User user = userService.updateProfile(authentication.getName(), request.name(), request.phone());
        return ResponseEntity.ok(ApiResponse.success(toMeResponse(user), "Profile updated successfully"));
    }
```

- [ ] **Step 10: Run the integration tests to verify they pass**

Run: `cd backend && ./mvnw test -Dtest=AuthFlowIntegrationTest`
Expected: PASS (all tests in the class)

- [ ] **Step 11: Commit**

```bash
git add backend/src/main/java/com/travelease/backend/auth backend/src/test/java/com/travelease/backend/auth
git commit -m "feat(backend): add PUT /api/auth/me to update name and phone"
```

---

### Task 3: `POST /api/auth/change-password` — change password via security answer

**Files:**
- Create: `backend/src/main/java/com/travelease/backend/auth/dto/ChangePasswordRequest.java`
- Modify: `backend/src/main/java/com/travelease/backend/auth/service/UserService.java`
- Modify: `backend/src/main/java/com/travelease/backend/auth/service/UserServiceImpl.java`
- Modify: `backend/src/main/java/com/travelease/backend/auth/controller/AuthController.java`
- Test: `backend/src/test/java/com/travelease/backend/auth/service/UserServiceImplTest.java`
- Test: `backend/src/test/java/com/travelease/backend/auth/controller/AuthFlowIntegrationTest.java`

**Interfaces:**
- Consumes: nothing from Task 2 (independent method on the same `UserService`/`UserServiceImpl`/`AuthController` files).
- Produces: `UserService.changePassword(String email, String securityAnswer, String newPassword): void`, throws `InvalidRequestException` on mismatch.

- [ ] **Step 1: Add failing unit tests to `UserServiceImplTest.java`**

```java
    @Test
    void changePasswordUpdatesHashWhenSecurityAnswerMatches() {
        User user = new User();
        user.setEmail("asha@example.com");
        user.setSecurityAnswerHash("hashed-answer");
        when(userRepository.findByEmail("asha@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("City General", "hashed-answer")).thenReturn(true);
        when(passwordEncoder.encode("NewPassw0rd1")).thenReturn("hashed-new-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        userService.changePassword("asha@example.com", "City General", "NewPassw0rd1");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getPasswordHash()).isEqualTo("hashed-new-password");
    }

    @Test
    void changePasswordThrowsWhenSecurityAnswerDoesNotMatch() {
        User user = new User();
        user.setEmail("asha@example.com");
        user.setSecurityAnswerHash("hashed-answer");
        when(userRepository.findByEmail("asha@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Wrong Answer", "hashed-answer")).thenReturn(false);

        assertThatThrownBy(() -> userService.changePassword("asha@example.com", "Wrong Answer", "NewPassw0rd1"))
                .isInstanceOf(InvalidRequestException.class);
        verify(userRepository, org.mockito.Mockito.never()).save(any(User.class));
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && ./mvnw test -Dtest=UserServiceImplTest#changePasswordUpdatesHashWhenSecurityAnswerMatches+changePasswordThrowsWhenSecurityAnswerDoesNotMatch`
Expected: FAIL — compile error, `UserService.changePassword` does not exist yet.

- [ ] **Step 3: Add `ChangePasswordRequest` DTO**

```java
package com.travelease.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "security answer is required")
        String securityAnswer,

        @NotBlank(message = "new password is required")
        @Size(min = 8, message = "new password must be at least 8 characters")
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$",
                message = "new password must contain at least one letter and one digit"
        )
        String newPassword
) {
}
```

- [ ] **Step 4: Add `changePassword` to `UserService` interface**

```java
    void changePassword(String email, String securityAnswer, String newPassword);
```

- [ ] **Step 5: Implement `changePassword` in `UserServiceImpl`**

```java
    @Override
    @Transactional
    public void changePassword(String email, String securityAnswer, String newPassword) {
        User user = getByEmail(email);
        if (!passwordEncoder.matches(securityAnswer, user.getSecurityAnswerHash())) {
            throw new InvalidRequestException("Security answer did not match");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
```

- [ ] **Step 6: Run the unit tests to verify they pass**

Run: `cd backend && ./mvnw test -Dtest=UserServiceImplTest`
Expected: PASS (all tests in the class)

- [ ] **Step 7: Add failing integration tests**

```java
    @Test
    void changePasswordAllowsLoginWithNewPasswordAfterCorrectSecurityAnswer() {
        RegisterRequest registerRequest = new RegisterRequest("Asha", "asha-pwd@example.com", "9999999999", "Passw0rd1", "What is your birth hospital?", "City General");
        restTemplate.postForEntity("/api/auth/register", registerRequest, ApiResponse.class);
        String token = loginAndGetToken("asha-pwd@example.com", "Passw0rd1");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        Map<String, String> changeBody = Map.of("securityAnswer", "City General", "newPassword", "NewPassw0rd1");
        ResponseEntity<ApiResponse> response = restTemplate.exchange(
                "/api/auth/change-password", HttpMethod.POST, new HttpEntity<>(changeBody, headers), ApiResponse.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        LoginRequest newLogin = new LoginRequest("asha-pwd@example.com", "NewPassw0rd1");
        ResponseEntity<ApiResponse> loginResponse = restTemplate.postForEntity("/api/auth/login", newLogin, ApiResponse.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void changePasswordRejectsWrongSecurityAnswer() {
        RegisterRequest registerRequest = new RegisterRequest("Asha", "asha-pwd-wrong@example.com", "9999999999", "Passw0rd1", "What is your birth hospital?", "City General");
        restTemplate.postForEntity("/api/auth/register", registerRequest, ApiResponse.class);
        String token = loginAndGetToken("asha-pwd-wrong@example.com", "Passw0rd1");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        Map<String, String> changeBody = Map.of("securityAnswer", "Wrong Answer", "newPassword", "NewPassw0rd1");
        ResponseEntity<ApiResponse> response = restTemplate.exchange(
                "/api/auth/change-password", HttpMethod.POST, new HttpEntity<>(changeBody, headers), ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
```

- [ ] **Step 8: Run the integration tests to verify they fail**

Run: `cd backend && ./mvnw test -Dtest=AuthFlowIntegrationTest#changePasswordAllowsLoginWithNewPasswordAfterCorrectSecurityAnswer+changePasswordRejectsWrongSecurityAnswer`
Expected: FAIL — 404, no `POST /api/auth/change-password` mapping exists yet.

- [ ] **Step 9: Add the `POST /change-password` endpoint to `AuthController`**

Add this import:

```java
import com.travelease.backend.auth.dto.ChangePasswordRequest;
```

Add this method (below `updateMe`):

```java
    @PostMapping("/change-password")
    @Operation(summary = "Change the current authenticated user's password", description = "ACCESS: AUTHENTICATED\nSCOPE: Verifies the security answer then updates the password hash for the user resolved from the current JWT identity.\nIDENTITY: The authenticated email from the security context is used; no client-supplied userId is trusted.")
    public ResponseEntity<ApiResponse<Void>> changePassword(@Valid @RequestBody ChangePasswordRequest request, Authentication authentication) {
        userService.changePassword(authentication.getName(), request.securityAnswer(), request.newPassword());
        return ResponseEntity.ok(ApiResponse.success(null, "Password changed successfully"));
    }
```

- [ ] **Step 10: Run the integration tests to verify they pass**

Run: `cd backend && ./mvnw test -Dtest=AuthFlowIntegrationTest`
Expected: PASS (all tests in the class)

- [ ] **Step 11: Run the entire backend test suite**

Run: `cd backend && ./mvnw test`
Expected: PASS (BUILD SUCCESS, no regressions in unrelated modules)

- [ ] **Step 12: Commit**

```bash
git add backend/src/main/java/com/travelease/backend/auth backend/src/test/java/com/travelease/backend/auth
git commit -m "feat(backend): add POST /api/auth/change-password gated by security answer"
```

---

### Task 4: Frontend `ProfileService`

**Files:**
- Create: `frontend/src/app/features/profile/services/profile.service.ts`
- Test: `frontend/src/app/features/profile/services/profile.service.spec.ts`

**Interfaces:**
- Produces: `ProfileService` (`providedIn: 'root'`) with `getMe(): Promise<MeResponse>`, `updateProfile(name: string, phone: string): Promise<MeResponse>`, `changePassword(securityAnswer: string, newPassword: string): Promise<void>`, and the exported `MeResponse` interface — Task 5 imports all of these.

- [ ] **Step 1: Write the failing test file**

```typescript
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ProfileService } from '@app/features/profile/services/profile.service';

describe('ProfileService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return {
      service: TestBed.inject(ProfileService),
      httpMock: TestBed.inject(HttpTestingController),
    };
  }

  it('getMe fetches the current user from /api/auth/me', async () => {
    const { service, httpMock } = await setup();

    const promise = service.getMe();
    const req = httpMock.expectOne(`${API_BASE_URL}/api/auth/me`);
    expect(req.request.method).toBe('GET');
    req.flush({
      success: true,
      data: {
        id: '1', name: 'Asha R', email: 'asha@example.com', phone: '9999999999',
        role: 'ROLE_TRAVELER', providerId: null, securityQuestion: 'Birth hospital?',
      },
      message: 'Current user retrieved', error: null,
    });

    const result = await promise;
    expect(result.name).toBe('Asha R');
    expect(result.securityQuestion).toBe('Birth hospital?');
    httpMock.verify();
  });

  it('updateProfile sends a PUT with name and phone and returns the updated user', async () => {
    const { service, httpMock } = await setup();

    const promise = service.updateProfile('Asha Rao', '8888888888');
    const req = httpMock.expectOne(`${API_BASE_URL}/api/auth/me`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Asha Rao', phone: '8888888888' });
    req.flush({
      success: true,
      data: {
        id: '1', name: 'Asha Rao', email: 'asha@example.com', phone: '8888888888',
        role: 'ROLE_TRAVELER', providerId: null, securityQuestion: 'Birth hospital?',
      },
      message: 'Profile updated successfully', error: null,
    });

    const result = await promise;
    expect(result.name).toBe('Asha Rao');
    expect(result.phone).toBe('8888888888');
    httpMock.verify();
  });

  it('changePassword sends a POST with securityAnswer and newPassword', async () => {
    const { service, httpMock } = await setup();

    const promise = service.changePassword('City General', 'NewPassw0rd1');
    const req = httpMock.expectOne(`${API_BASE_URL}/api/auth/change-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ securityAnswer: 'City General', newPassword: 'NewPassw0rd1' });
    req.flush({ success: true, data: null, message: 'Password changed successfully', error: null });

    await promise;
    httpMock.verify();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx ng test --include=src/app/features/profile/services/profile.service.spec.ts --watch=false`
Expected: FAIL — cannot resolve `@app/features/profile/services/profile.service` (module does not exist yet).

- [ ] **Step 3: Implement `ProfileService`**

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';

export interface MeResponse {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  providerId: number | null;
  securityQuestion: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);

  async getMe(): Promise<MeResponse> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<MeResponse>>(`${API_BASE_URL}/api/auth/me`),
    );
    return response.data;
  }

  async updateProfile(name: string, phone: string): Promise<MeResponse> {
    const response = await firstValueFrom(
      this.http.put<ApiResponse<MeResponse>>(`${API_BASE_URL}/api/auth/me`, { name, phone }),
    );
    return response.data;
  }

  async changePassword(securityAnswer: string, newPassword: string): Promise<void> {
    await firstValueFrom(
      this.http.post<ApiResponse<unknown>>(`${API_BASE_URL}/api/auth/change-password`, {
        securityAnswer,
        newPassword,
      }),
    );
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx ng test --include=src/app/features/profile/services/profile.service.spec.ts --watch=false`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/profile/services
git commit -m "feat(frontend): add ProfileService for updating profile and changing password"
```

---

### Task 5: Rewrite the Profile component — working "Save changes" form

**Files:**
- Modify: `frontend/src/app/features/profile/components/profile/profile.ts`
- Modify: `frontend/src/app/features/profile/components/profile/profile.html`
- Modify: `frontend/src/app/features/profile/components/profile/profile.spec.ts`

**Interfaces:**
- Consumes: `ProfileService`, `MeResponse` from Task 4.
- Produces: `Profile` component protected members `savingProfile: WritableSignal<boolean>`, `profileError: WritableSignal<string | null>`, `onSaveProfile(event: Event): Promise<void>` — Task 6 adds the password section to the same files and reuses `profile`/`toastService`.

- [ ] **Step 1: Update `profile.spec.ts` — replace the existing test and add a save-flow test**

Replace the whole file:

```typescript
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@app/core/api/api-config';
import { Profile } from '@app/features/profile/components/profile/profile';

describe('Profile', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(Profile);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const req = http.expectOne(`${API_BASE_URL}/api/auth/me`);
    req.flush({
      success: true,
      data: {
        id: '1', name: 'Asha R', email: 'asha@example.com', phone: '+91 9999999999',
        role: 'ROLE_TRAVELER', providerId: null, securityQuestion: 'What hospital were you born in?',
      },
      message: 'Current user retrieved', error: null,
    });
    fixture.detectChanges();

    return { fixture, http };
  }

  it('loads the current user from auth/me and renders the returned profile details', async () => {
    const { fixture, http } = await setup();
    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent ?? '';

    expect(text).toContain('Asha R');
    expect(text).toContain('asha@example.com');
    expect(text).toContain('+91 9999999999');
    expect(text).toContain('Traveler');

    const inputValues = Array.from(el.querySelectorAll('input')).map(
      (i) => (i as HTMLInputElement).value,
    );
    expect(inputValues).toContain('Asha R');
    expect(inputValues).toContain('asha@example.com');
    expect(inputValues).toContain('+91 9999999999');

    http.verify();
  });

  it('saves profile changes via PUT /api/auth/me and shows a success toast', async () => {
    const { fixture, http } = await setup();
    const el = fixture.nativeElement as HTMLElement;

    const nameInput = el.querySelector('input[name="name"]') as HTMLInputElement;
    const phoneInput = el.querySelector('input[name="phone"]') as HTMLInputElement;
    nameInput.value = 'Asha Rao';
    phoneInput.value = '8888888888';

    const form = el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    const updateReq = http.expectOne(`${API_BASE_URL}/api/auth/me`);
    expect(updateReq.request.method).toBe('PUT');
    expect(updateReq.request.body).toEqual({ name: 'Asha Rao', phone: '8888888888' });
    updateReq.flush({
      success: true,
      data: {
        id: '1', name: 'Asha Rao', email: 'asha@example.com', phone: '8888888888',
        role: 'ROLE_TRAVELER', providerId: null, securityQuestion: 'What hospital were you born in?',
      },
      message: 'Profile updated successfully', error: null,
    });
    fixture.detectChanges();

    expect((el.textContent ?? '')).toContain('Asha Rao');
    http.verify();
  });

  it('blocks the save when the name is too short and makes no HTTP call', async () => {
    const { fixture, http } = await setup();
    const el = fixture.nativeElement as HTMLElement;

    const nameInput = el.querySelector('input[name="name"]') as HTMLInputElement;
    nameInput.value = 'A';

    const form = el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();

    expect((el.textContent ?? '')).toContain('Name must be at least 2 characters');
    http.verify();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx ng test --include=src/app/features/profile/components/profile/profile.spec.ts --watch=false`
Expected: FAIL — no `input[name="name"]`/`input[name="phone"]` (current template has no `name` attributes and no submit handler), no PUT request is made.

- [ ] **Step 3: Rewrite `profile.ts`**

```typescript
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { MeResponse, ProfileService } from '@app/features/profile/services/profile.service';
import { ToastService } from '@app/shared/ui/toast/toast.service';
import { PageHeader } from '@app/shared/ui/page-header/page-header';

@Component({
  selector: 'app-profile',
  imports: [
    HlmCardImports,
    HlmButtonImports,
    HlmInputImports,
    HlmLabelImports,
    HlmAvatarImports,
    PageHeader,
  ],
  templateUrl: './profile.html',
})
export class Profile implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly toastService = inject(ToastService);

  protected readonly profile = signal<MeResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly savingProfile = signal(false);
  protected readonly profileError = signal<string | null>(null);

  protected readonly passwordFormOpen = signal(false);
  protected readonly changingPassword = signal(false);
  protected readonly passwordError = signal<string | null>(null);

  ngOnInit(): void {
    void this.loadProfile();
  }

  protected initials(name: string | null | undefined): string {
    const trimmed = name?.trim();
    if (!trimmed) {
      return 'U';
    }

    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return 'U';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  protected roleLabel(role: string | null | undefined): string {
    const roleMap: Record<string, string> = {
      ROLE_ADMIN: 'Admin',
      ROLE_TRAVELER: 'Traveler',
      ROLE_PROVIDER: 'Transport Partner',
      ROLE_HOTEL_PROVIDER: 'Hotel Partner',
      ROLE_ACTIVITY_PROVIDER: 'Activity Partner',
    };

    return roleMap[role ?? ''] ?? 'Traveler';
  }

  protected async onSaveProfile(event: Event): Promise<void> {
    event.preventDefault();
    this.profileError.set(null);

    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim();

    if (name.length < 2) {
      this.profileError.set('Name must be at least 2 characters.');
      return;
    }
    if (!phone) {
      this.profileError.set('Phone is required.');
      return;
    }

    this.savingProfile.set(true);
    try {
      const updated = await this.profileService.updateProfile(name, phone);
      this.profile.set(updated);
      this.toastService.showSuccess('Profile updated successfully');
    } catch (err) {
      this.profileError.set(
        err instanceof HttpErrorResponse
          ? (err.error?.error?.message ?? 'Unable to update your profile right now.')
          : 'Unable to update your profile right now.',
      );
    } finally {
      this.savingProfile.set(false);
    }
  }

  protected togglePasswordForm(): void {
    this.passwordError.set(null);
    this.passwordFormOpen.update((open) => !open);
  }

  protected async onChangePassword(event: Event): Promise<void> {
    event.preventDefault();
    this.passwordError.set(null);

    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const securityAnswer = String(data.get('securityAnswer') ?? '').trim();
    const newPassword = String(data.get('newPassword') ?? '');
    const confirmNewPassword = String(data.get('confirmNewPassword') ?? '');

    if (!securityAnswer) {
      this.passwordError.set('Please answer your security question.');
      return;
    }
    if (newPassword.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d).+$/.test(newPassword)) {
      this.passwordError.set('New password must be at least 8 characters and contain a letter and a digit.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      this.passwordError.set('Passwords do not match.');
      return;
    }

    this.changingPassword.set(true);
    try {
      await this.profileService.changePassword(securityAnswer, newPassword);
      this.toastService.showSuccess('Password changed successfully');
      this.passwordFormOpen.set(false);
      form.reset();
    } catch (err) {
      this.passwordError.set(
        err instanceof HttpErrorResponse
          ? (err.error?.error?.message ?? 'Unable to change your password right now.')
          : 'Unable to change your password right now.',
      );
    } finally {
      this.changingPassword.set(false);
    }
  }

  private async loadProfile(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const profile = await this.profileService.getMe();
      this.profile.set(profile);
    } catch {
      this.error.set('We could not load your profile. Please refresh and try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
```

- [ ] **Step 4: Rewrite `profile.html`**

```html
<app-page-header title="Profile" subtitle="Manage your account and travel preferences." />

@if (loading()) {
  <div class="grid gap-6 xl:grid-cols-[320px,1fr]">
    <div hlmCard>
      <div hlmCardContent class="p-6 text-center">
        <div class="mx-auto mb-4 h-24 w-24 rounded-full bg-muted animate-pulse"></div>
        <div class="mx-auto mb-2 h-5 w-32 rounded bg-muted animate-pulse"></div>
        <div class="mx-auto h-4 w-44 rounded bg-muted/80 animate-pulse"></div>
      </div>
    </div>
    <div hlmCard>
      <div hlmCardContent class="grid gap-4 p-6 md:grid-cols-2">
        <div class="h-20 rounded-lg bg-muted animate-pulse"></div>
        <div class="h-20 rounded-lg bg-muted animate-pulse"></div>
        <div class="h-20 rounded-lg bg-muted animate-pulse"></div>
        <div class="h-20 rounded-lg bg-muted animate-pulse"></div>
      </div>
    </div>
  </div>
} @else if (error()) {
  <div class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
    {{ error() }}
  </div>
} @else {
  <div class="grid gap-6 xl:grid-cols-[320px,1fr]">
    <div hlmCard class="overflow-hidden">
      <div hlmCardContent class="p-6 text-center">
        <hlm-avatar class="mx-auto mb-4 h-24 w-24">
          <span hlmAvatarFallback class="bg-primary text-primary-foreground text-2xl">
            {{ initials(profile()?.name) }}
          </span>
        </hlm-avatar>
        <h3 class="text-lg font-semibold">{{ profile()?.name ?? 'Traveler' }}</h3>
        <p class="mt-1 text-sm text-muted-foreground">{{ profile()?.email ?? 'No email available' }}</p>
        <div class="mt-4 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {{ roleLabel(profile()?.role) }}
        </div>
      </div>
    </div>

    <div hlmCard class="overflow-hidden">
      <div hlmCardHeader class="border-b border-border/60">
        <h3 hlmCardTitle>Account details</h3>
        <p class="text-sm text-muted-foreground">Update your name and phone number.</p>
      </div>
      <div hlmCardContent class="p-6 space-y-6">
        <form class="grid gap-4 md:grid-cols-2" (submit)="onSaveProfile($event)">
          @if (profileError()) {
            <div class="md:col-span-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {{ profileError() }}
            </div>
          }
          <div class="space-y-2">
            <label hlmLabel for="name">Full name</label>
            <input hlmInput id="name" name="name" [value]="profile()?.name ?? ''" />
          </div>
          <div class="space-y-2">
            <label hlmLabel for="email">Email</label>
            <input hlmInput id="email" [value]="profile()?.email ?? ''" readonly disabled />
          </div>
          <div class="space-y-2">
            <label hlmLabel for="phone">Phone</label>
            <input hlmInput id="phone" name="phone" [value]="profile()?.phone ?? ''" />
          </div>

          <div class="md:col-span-2 flex flex-wrap gap-3">
            <button hlmBtn type="submit" [disabled]="savingProfile()">
              {{ savingProfile() ? 'Saving...' : 'Save changes' }}
            </button>
            <button hlmBtn type="button" variant="outline" (click)="togglePasswordForm()">
              {{ passwordFormOpen() ? 'Cancel' : 'Change password' }}
            </button>
          </div>
        </form>

        @if (passwordFormOpen()) {
          <form class="grid gap-4 md:grid-cols-2 border-t border-border/60 pt-6" (submit)="onChangePassword($event)">
            @if (passwordError()) {
              <div class="md:col-span-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {{ passwordError() }}
              </div>
            }
            <div class="md:col-span-2 space-y-2">
              <label hlmLabel>Security question</label>
              <p class="text-sm text-muted-foreground">{{ profile()?.securityQuestion }}</p>
            </div>
            <div class="md:col-span-2 space-y-2">
              <label hlmLabel for="securityAnswer">Your answer</label>
              <input hlmInput id="securityAnswer" name="securityAnswer" />
            </div>
            <div class="space-y-2">
              <label hlmLabel for="newPassword">New password</label>
              <input hlmInput id="newPassword" name="newPassword" type="password" placeholder="At least 8 characters" />
            </div>
            <div class="space-y-2">
              <label hlmLabel for="confirmNewPassword">Confirm new password</label>
              <input hlmInput id="confirmNewPassword" name="confirmNewPassword" type="password" />
            </div>
            <div class="md:col-span-2">
              <button hlmBtn type="submit" [disabled]="changingPassword()">
                {{ changingPassword() ? 'Updating...' : 'Update password' }}
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  </div>
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npx ng test --include=src/app/features/profile/components/profile/profile.spec.ts --watch=false`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/profile/components/profile
git commit -m "feat(frontend): wire up the profile save-changes form"
```

---

### Task 6: Change-password form on the Profile page

**Files:**
- Modify: `frontend/src/app/features/profile/components/profile/profile.spec.ts`

**Interfaces:**
- Consumes: `passwordFormOpen`, `onChangePassword`, `togglePasswordForm`, `passwordError`, `changingPassword` from `Profile` (already written in Task 5's `profile.ts`/`profile.html` — this task only adds test coverage for that already-implemented behavior, since it was simplest to write both forms together in Task 5's template/component rewrite).

Note: because the profile form and the password form share the same component class and template file, Task 5 already implements the password form's markup and handler. This task's job is to lock in test coverage for it (TDD after the fact for this sub-feature is acceptable here since both forms were designed together as one cohesive rewrite — the alternative of splitting `profile.ts`/`profile.html` into two half-edited states between Task 5 and Task 6 would leave Task 5 in a broken, non-compiling intermediate state).

- [ ] **Step 1: Add password-flow tests to `profile.spec.ts`**

Add these tests inside the existing `describe('Profile', ...)` block (after the `'blocks the save when the name is too short...'` test):

```typescript
  it('opens the password form and submits a password change', async () => {
    const { fixture, http } = await setup();
    const el = fixture.nativeElement as HTMLElement;

    const toggleBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Change password'),
    ) as HTMLButtonElement;
    toggleBtn.click();
    fixture.detectChanges();

    const answerInput = el.querySelector('input[name="securityAnswer"]') as HTMLInputElement;
    const newPasswordInput = el.querySelector('input[name="newPassword"]') as HTMLInputElement;
    const confirmInput = el.querySelector('input[name="confirmNewPassword"]') as HTMLInputElement;
    answerInput.value = 'City General';
    newPasswordInput.value = 'NewPassw0rd1';
    confirmInput.value = 'NewPassw0rd1';

    const forms = el.querySelectorAll('form');
    const passwordForm = forms[1] as HTMLFormElement;
    passwordForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    const req = http.expectOne(`${API_BASE_URL}/api/auth/change-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ securityAnswer: 'City General', newPassword: 'NewPassw0rd1' });
    req.flush({ success: true, data: null, message: 'Password changed successfully', error: null });
    fixture.detectChanges();

    expect(el.querySelectorAll('form')).toHaveLength(1);
    http.verify();
  });

  it('blocks the password change when confirmation does not match and makes no HTTP call', async () => {
    const { fixture, http } = await setup();
    const el = fixture.nativeElement as HTMLElement;

    const toggleBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Change password'),
    ) as HTMLButtonElement;
    toggleBtn.click();
    fixture.detectChanges();

    const answerInput = el.querySelector('input[name="securityAnswer"]') as HTMLInputElement;
    const newPasswordInput = el.querySelector('input[name="newPassword"]') as HTMLInputElement;
    const confirmInput = el.querySelector('input[name="confirmNewPassword"]') as HTMLInputElement;
    answerInput.value = 'City General';
    newPasswordInput.value = 'NewPassw0rd1';
    confirmInput.value = 'DifferentPassw0rd1';

    const forms = el.querySelectorAll('form');
    const passwordForm = forms[1] as HTMLFormElement;
    passwordForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();

    expect((el.textContent ?? '')).toContain('Passwords do not match');
    http.verify();
  });
```

- [ ] **Step 2: Run the tests to verify they pass**

Run: `cd frontend && npx ng test --include=src/app/features/profile/components/profile/profile.spec.ts --watch=false`
Expected: PASS (5 tests total in the file)

- [ ] **Step 3: Run the full frontend test suite to check for regressions**

Run: `cd frontend && npx ng test --watch=false`
Expected: PASS (no regressions elsewhere)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/features/profile/components/profile/profile.spec.ts
git commit -m "test(frontend): cover the profile change-password form"
```
