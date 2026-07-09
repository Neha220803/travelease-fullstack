# Contact Support Ticket Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any logged-in traveler raise a support/complaint ticket (picking a category — Bus, Hotel, Activity, Trip, Other) from a new "Contact Support" page, track their own tickets and admin replies, and let admins triage/reply/resolve every ticket from one filterable queue in the admin dashboard.

**Architecture:** A net-new `support` module on both sides, mirroring the existing per-domain layering exactly: backend `support/{controller,dto,entity,repository,service}` package (Spring Boot/JPA/H2), frontend `features/support/{components,services}` feature folder (Angular standalone components + signals), plus one new admin component wired into the existing admin dashboard shell. No other module is modified except the shared nav/routing/icon registration files needed to link the new pages in.

**Tech Stack:** Java 17 / Spring Boot 3.5 / Spring Data JPA / Spring Security (JWT) / Lombok / JUnit 5 + Mockito + AssertJ (backend). Angular (standalone components, signals, `inject()`) / Spartan `hlm-*` UI components / RxJS / Vitest (frontend).

## Global Constraints

- All entity ids are `UUID`, generated in application code via `BaseEntity` (`private UUID id = UUID.randomUUID();`) — **not** `@GeneratedValue`/`Long`, despite what `backend/docs/coding_guidelines.md` says; that doc is stale, the actual `BaseEntity` in `backend/src/main/java/com/travelease/backend/shared/entity/BaseEntity.java` is the source of truth.
- Every entity subclass must add `@AttributeOverride(name = "id", column = @Column(name = "<x>_id", nullable = false, updatable = false))` to rename the inherited `id` column.
- DTOs are Java `record`s with `jakarta.validation` annotations directly on the record components — no Lombok on DTOs.
- Entities use Lombok `@Getter @Setter` — never `@Data`.
- Use `com.travelease.backend.shared.dto.ApiResponse<T>` (the record-based one in `shared/dto`) for every controller response — **not** `com.travelease.backend.busbooking.dto.response.ApiResponse`, which is a separate legacy class used only inside `busbooking`.
- Controllers resolve the current user via an injected `Authentication authentication` parameter and pass `authentication.getName()` (the JWT subject = email) down to the service; the service resolves it to a `User` via `userRepository.findByEmail(email)`.
- Admin-only controllers get `@PreAuthorize("hasRole('ADMIN')")` at the class level. `SecurityConfig` already defaults every endpoint to `auth.anyRequest().authenticated()` and has `@EnableMethodSecurity` on — no `SecurityConfig` changes are needed for this feature.
- Services throw `com.travelease.backend.shared.exception.ResourceNotFoundException` (→ 404) and `InvalidRequestException` (→ 400); both are already handled by the existing `GlobalExceptionHandler`. No new exception types are needed.
- Backend testing convention actually used in this repo (verified via `backend/src/test`): `*ServiceImplTest` classes with `@ExtendWith(MockitoExtension.class)`, `@Mock`/`@InjectMocks`, and **AssertJ** assertions (`assertThat`, `assertThatThrownBy`) — not plain JUnit `assertEquals`. There is **no** `@WebMvcTest`/controller-slice-test precedent anywhere in this repo (verified by grep), so this plan does not introduce one; controllers stay thin enough that the service tests are the real coverage.
- Frontend forms never use Angular `ReactiveFormsModule`/`FormsModule` — they use plain template reference variables (`#someInput`) read positionally in `(submit)="onSubmit($event, someInput.value)"`, plus signals for local UI state (`signal()`), and `inject()` for DI in components.
- Frontend services: `@Injectable({ providedIn: 'root' })`, inject `HttpClient`, every method does `.pipe(map((response) => response.data))` to unwrap the `ApiResponse<T>` envelope from `@app/core/api/api-response.model`. Base URL comes from `API_BASE_URL` in `@app/core/api/api-config`.
- Frontend test runner is **Vitest** (`vi.fn()`, `vi.spyOn()`), not Jasmine — confirmed via `frontend/package.json` (`"vitest": "^4.0.8"`) and `frontend/angular.json` (`"test": { "builder": "@angular/build:unit-test" }`). `describe`/`it`/`expect` read like Jasmine but mocks must use `vi.fn()`/`vi.spyOn()`.
- Frontend HTTP tests use `provideHttpClient()` + `provideHttpClientTesting()` and `HttpTestingController.expectOne(...)`/`req.flush(...)` — not `HttpClientTestingModule`.
- Component tests that depend on a service mock the service via `{ provide: SomeService, useValue: { methodName: () => of(data) } }` — they do not hit real HTTP.
- Any new icon used in a template must be added to the global `provideIcons({...})` call in `frontend/src/app/app.config.ts`, and to any test file that renders that template with `provideIcons(...)` (e.g. `app-shell.spec.ts` renders every nav item, so every nav icon must be registered there too, or the test throws at render time).
- Category values: `BUS`, `HOTEL`, `ACTIVITY`, `TRIP`, `OTHER` (Java enum `TicketCategory`, TS union type `TicketCategory`). Status values: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` (Java enum `TicketStatus`, TS union type `TicketStatus`), defaulting to `OPEN` on create.
- Ticket ownership mismatch (a traveler requesting a ticket that isn't theirs) returns **404**, not 403 — implemented by throwing `ResourceNotFoundException` directly from the ownership check, not `AccessDeniedException`. This is a deliberate deviation from the `ensureBookingOwner`/`ensureReviewOwner` pattern elsewhere (which throws `AccessDeniedException`/403), per the approved spec.
- Replies are one-way (admin → user only) for this v1 — `SupportTicketReply` has no author/sender field. `SupportTicket.updatedAt` is bumped by JPA auditing only on status changes (a real field mutation), not on new replies — the reply thread's own timestamps already show reply recency, so no entity-touching workaround is needed or attempted.
- Out of scope for v1 (do not implement): booking linkage, file attachments, priority field, email notifications, two-way chat, per-provider ticket routing. See the approved spec at `frontend/docs/superpowers/specs/2026-07-09-contact-support-ticket-design.md` for full rationale.

---

## Task 1: Backend — `TicketCategory`/`TicketStatus` enums and `SupportTicket`/`SupportTicketReply` entities

**Files:**
- Create: `backend/src/main/java/com/travelease/backend/support/entity/TicketCategory.java`
- Create: `backend/src/main/java/com/travelease/backend/support/entity/TicketStatus.java`
- Create: `backend/src/main/java/com/travelease/backend/support/entity/SupportTicket.java`
- Create: `backend/src/main/java/com/travelease/backend/support/entity/SupportTicketReply.java`

**Interfaces:**
- Consumes: `com.travelease.backend.shared.entity.BaseEntity` (provides `UUID id`, `LocalDateTime createdAt`, `LocalDateTime updatedAt`), `com.travelease.backend.auth.entity.User`.
- Produces: `TicketCategory` enum (`BUS, HOTEL, ACTIVITY, TRIP, OTHER`), `TicketStatus` enum (`OPEN, IN_PROGRESS, RESOLVED, CLOSED`), `SupportTicket` entity (fields: `user`, `category`, `subject`, `description`, `status`), `SupportTicketReply` entity (fields: `ticket`, `message`) — all consumed by Task 2 (repositories) and Task 4 (service).

This task has no独立 unit-testable behavior (plain JPA entities/enums) — the existing codebase does not unit-test entities directly (verified: no entity tests found anywhere in `backend/src/test`). Compile-checking via the module build is the verification step.

- [ ] **Step 1: Create the `TicketCategory` enum**

```java
package com.travelease.backend.support.entity;

public enum TicketCategory {
    BUS,
    HOTEL,
    ACTIVITY,
    TRIP,
    OTHER
}
```

- [ ] **Step 2: Create the `TicketStatus` enum**

```java
package com.travelease.backend.support.entity;

public enum TicketStatus {
    OPEN,
    IN_PROGRESS,
    RESOLVED,
    CLOSED
}
```

- [ ] **Step 3: Create the `SupportTicket` entity**

```java
package com.travelease.backend.support.entity;

import com.travelease.backend.auth.entity.User;
import com.travelease.backend.shared.entity.BaseEntity;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@AttributeOverride(name = "id", column = @Column(name = "ticket_id", nullable = false, updatable = false))
@Table(name = "support_tickets")
public class SupportTicket extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TicketCategory category;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TicketStatus status = TicketStatus.OPEN;
}
```

- [ ] **Step 4: Create the `SupportTicketReply` entity**

```java
package com.travelease.backend.support.entity;

import com.travelease.backend.shared.entity.BaseEntity;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@AttributeOverride(name = "id", column = @Column(name = "reply_id", nullable = false, updatable = false))
@Table(name = "support_ticket_replies")
public class SupportTicketReply extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private SupportTicket ticket;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;
}
```

- [ ] **Step 5: Compile the backend to verify the new package builds cleanly**

Run: `cd backend && ./mvnw -q compile`
Expected: `BUILD SUCCESS`, no errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/travelease/backend/support/entity/
git commit -m "feat(support): add SupportTicket/SupportTicketReply entities and category/status enums"
```

---

## Task 2: Backend — `SupportTicketRepository` and `SupportTicketReplyRepository`

**Files:**
- Create: `backend/src/main/java/com/travelease/backend/support/repository/SupportTicketRepository.java`
- Create: `backend/src/main/java/com/travelease/backend/support/repository/SupportTicketReplyRepository.java`

**Interfaces:**
- Consumes: `SupportTicket`, `SupportTicketReply`, `TicketCategory`, `TicketStatus` from Task 1.
- Produces: `SupportTicketRepository` with `findByUser_IdOrderByCreatedAtDesc(UUID)`, `findByCategoryAndStatusOrderByCreatedAtDesc(TicketCategory, TicketStatus)`, `findByCategoryOrderByCreatedAtDesc(TicketCategory)`, `findByStatusOrderByCreatedAtDesc(TicketStatus)`, `findAllByOrderByCreatedAtDesc()`; `SupportTicketReplyRepository` with `findByTicket_IdOrderByCreatedAtAsc(UUID)` — both consumed by Task 4 (service).

No dedicated repository test — matches the existing convention where plain derived-query repositories (e.g. `HotelReviewRepository`) have no test of their own; only `UserRepository` (which has a uniqueness constraint to verify) gets a `@DataJpaTest`. These derived queries are exercised indirectly through the `SupportTicketServiceImplTest` in Task 4 (with mocked repositories) and through manual verification when the app runs.

- [ ] **Step 1: Create `SupportTicketRepository`**

```java
package com.travelease.backend.support.repository;

import com.travelease.backend.support.entity.SupportTicket;
import com.travelease.backend.support.entity.TicketCategory;
import com.travelease.backend.support.entity.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, UUID> {

    List<SupportTicket> findByUser_IdOrderByCreatedAtDesc(UUID userId);

    List<SupportTicket> findByCategoryAndStatusOrderByCreatedAtDesc(TicketCategory category, TicketStatus status);

    List<SupportTicket> findByCategoryOrderByCreatedAtDesc(TicketCategory category);

    List<SupportTicket> findByStatusOrderByCreatedAtDesc(TicketStatus status);

    List<SupportTicket> findAllByOrderByCreatedAtDesc();
}
```

- [ ] **Step 2: Create `SupportTicketReplyRepository`**

```java
package com.travelease.backend.support.repository;

import com.travelease.backend.support.entity.SupportTicketReply;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SupportTicketReplyRepository extends JpaRepository<SupportTicketReply, UUID> {

    List<SupportTicketReply> findByTicket_IdOrderByCreatedAtAsc(UUID ticketId);
}
```

- [ ] **Step 3: Compile to verify the derived query method names resolve**

Run: `cd backend && ./mvnw -q compile`
Expected: `BUILD SUCCESS`. (Spring Data validates derived query method names against the entity's properties at application startup, not at compile time — Task 4's tests and a manual boot exercise this fully.)

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/travelease/backend/support/repository/
git commit -m "feat(support): add SupportTicketRepository and SupportTicketReplyRepository"
```

---

## Task 3: Backend — request/response DTOs

**Files:**
- Create: `backend/src/main/java/com/travelease/backend/support/dto/CreateTicketRequest.java`
- Create: `backend/src/main/java/com/travelease/backend/support/dto/ReplyRequest.java`
- Create: `backend/src/main/java/com/travelease/backend/support/dto/UpdateTicketStatusRequest.java`
- Create: `backend/src/main/java/com/travelease/backend/support/dto/TicketResponse.java`
- Create: `backend/src/main/java/com/travelease/backend/support/dto/ReplyResponse.java`
- Create: `backend/src/main/java/com/travelease/backend/support/dto/TicketDetailResponse.java`

**Interfaces:**
- Consumes: `TicketCategory`, `TicketStatus` from Task 1.
- Produces: `CreateTicketRequest(TicketCategory category, String subject, String description)`, `ReplyRequest(String message)`, `UpdateTicketStatusRequest(TicketStatus status)`, `TicketResponse(UUID ticketId, UUID userId, String userName, TicketCategory category, String subject, String description, TicketStatus status, LocalDateTime createdAt, LocalDateTime updatedAt)`, `ReplyResponse(UUID replyId, String message, LocalDateTime createdAt)`, `TicketDetailResponse(TicketResponse ticket, List<ReplyResponse> replies)` — all consumed by Task 4 (service) and Tasks 5–6 (controllers).

- [ ] **Step 1: Create `CreateTicketRequest`**

```java
package com.travelease.backend.support.dto;

import com.travelease.backend.support.entity.TicketCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateTicketRequest(
        @NotNull TicketCategory category,
        @NotBlank String subject,
        @NotBlank String description
) {
}
```

- [ ] **Step 2: Create `ReplyRequest`**

```java
package com.travelease.backend.support.dto;

import jakarta.validation.constraints.NotBlank;

public record ReplyRequest(
        @NotBlank String message
) {
}
```

- [ ] **Step 3: Create `UpdateTicketStatusRequest`**

```java
package com.travelease.backend.support.dto;

import com.travelease.backend.support.entity.TicketStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateTicketStatusRequest(
        @NotNull TicketStatus status
) {
}
```

- [ ] **Step 4: Create `TicketResponse`**

```java
package com.travelease.backend.support.dto;

import com.travelease.backend.support.entity.TicketCategory;
import com.travelease.backend.support.entity.TicketStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record TicketResponse(
        UUID ticketId,
        UUID userId,
        String userName,
        TicketCategory category,
        String subject,
        String description,
        TicketStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
```

- [ ] **Step 5: Create `ReplyResponse`**

```java
package com.travelease.backend.support.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ReplyResponse(
        UUID replyId,
        String message,
        LocalDateTime createdAt
) {
}
```

- [ ] **Step 6: Create `TicketDetailResponse`**

```java
package com.travelease.backend.support.dto;

import java.util.List;

public record TicketDetailResponse(
        TicketResponse ticket,
        List<ReplyResponse> replies
) {
}
```

- [ ] **Step 7: Compile to verify**

Run: `cd backend && ./mvnw -q compile`
Expected: `BUILD SUCCESS`.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/travelease/backend/support/dto/
git commit -m "feat(support): add support ticket request/response DTOs"
```

---

## Task 4: Backend — `SupportTicketService` + `SupportTicketServiceImpl` with unit tests

**Files:**
- Create: `backend/src/main/java/com/travelease/backend/support/service/SupportTicketService.java`
- Create: `backend/src/main/java/com/travelease/backend/support/service/SupportTicketServiceImpl.java`
- Test: `backend/src/test/java/com/travelease/backend/support/service/SupportTicketServiceImplTest.java`

**Interfaces:**
- Consumes: `SupportTicketRepository`, `SupportTicketReplyRepository` (Task 2), all DTOs (Task 3), `SupportTicket`/`SupportTicketReply`/`TicketCategory`/`TicketStatus` (Task 1), `com.travelease.backend.auth.repository.UserRepository`, `com.travelease.backend.auth.entity.User`, `com.travelease.backend.shared.exception.ResourceNotFoundException`.
- Produces: `SupportTicketService` interface with `createTicket(CreateTicketRequest, String currentUserEmail)`, `getMyTickets(String currentUserEmail)`, `getMyTicket(UUID ticketId, String currentUserEmail)`, `getAllTickets(TicketCategory, TicketStatus)`, `getTicketForAdmin(UUID ticketId)`, `addReply(UUID ticketId, ReplyRequest)`, `updateStatus(UUID ticketId, UpdateTicketStatusRequest)` — consumed by Task 5 (`SupportTicketController`) and Task 6 (`AdminSupportTicketController`).

- [ ] **Step 1: Write the failing test file**

```java
package com.travelease.backend.support.service;

import com.travelease.backend.auth.entity.Role;
import com.travelease.backend.auth.entity.User;
import com.travelease.backend.auth.repository.UserRepository;
import com.travelease.backend.shared.exception.ResourceNotFoundException;
import com.travelease.backend.support.dto.CreateTicketRequest;
import com.travelease.backend.support.dto.ReplyRequest;
import com.travelease.backend.support.dto.ReplyResponse;
import com.travelease.backend.support.dto.TicketDetailResponse;
import com.travelease.backend.support.dto.TicketResponse;
import com.travelease.backend.support.dto.UpdateTicketStatusRequest;
import com.travelease.backend.support.entity.SupportTicket;
import com.travelease.backend.support.entity.SupportTicketReply;
import com.travelease.backend.support.entity.TicketCategory;
import com.travelease.backend.support.entity.TicketStatus;
import com.travelease.backend.support.repository.SupportTicketReplyRepository;
import com.travelease.backend.support.repository.SupportTicketRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SupportTicketServiceImplTest {

    @Mock
    private SupportTicketRepository ticketRepository;

    @Mock
    private SupportTicketReplyRepository replyRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private SupportTicketServiceImpl supportTicketService;

    private User sampleUser(String email) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setName("Alice Traveler");
        user.setEmail(email);
        user.setPhone("9999999999");
        user.setPasswordHash("hash");
        user.setRole(Role.ROLE_TRAVELER);
        return user;
    }

    private SupportTicket sampleTicket(User user) {
        SupportTicket ticket = new SupportTicket();
        ticket.setId(UUID.randomUUID());
        ticket.setUser(user);
        ticket.setCategory(TicketCategory.HOTEL);
        ticket.setSubject("Room was dirty");
        ticket.setDescription("The room had not been cleaned before check-in.");
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setCreatedAt(LocalDateTime.now());
        ticket.setUpdatedAt(LocalDateTime.now());
        return ticket;
    }

    @Test
    void createTicketSavesTicketOwnedByCurrentUser() {
        User user = sampleUser("alice@travelease.test");
        when(userRepository.findByEmail("alice@travelease.test")).thenReturn(Optional.of(user));
        when(ticketRepository.save(any(SupportTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateTicketRequest request =
                new CreateTicketRequest(TicketCategory.BUS, "Bus was late", "The bus arrived 2 hours late.");
        TicketResponse response = supportTicketService.createTicket(request, "alice@travelease.test");

        assertThat(response.userId()).isEqualTo(user.getId());
        assertThat(response.category()).isEqualTo(TicketCategory.BUS);
        assertThat(response.subject()).isEqualTo("Bus was late");
        assertThat(response.status()).isEqualTo(TicketStatus.OPEN);
    }

    @Test
    void getMyTicketsReturnsOnlyCurrentUsersTickets() {
        User user = sampleUser("alice@travelease.test");
        when(userRepository.findByEmail("alice@travelease.test")).thenReturn(Optional.of(user));
        when(ticketRepository.findByUser_IdOrderByCreatedAtDesc(user.getId()))
                .thenReturn(List.of(sampleTicket(user)));

        List<TicketResponse> result = supportTicketService.getMyTickets("alice@travelease.test");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).userId()).isEqualTo(user.getId());
    }

    @Test
    void getMyTicketReturnsDetailWithRepliesWhenOwnedByCaller() {
        User user = sampleUser("alice@travelease.test");
        SupportTicket ticket = sampleTicket(user);
        SupportTicketReply reply = new SupportTicketReply();
        reply.setId(UUID.randomUUID());
        reply.setTicket(ticket);
        reply.setMessage("We're looking into this.");
        reply.setCreatedAt(LocalDateTime.now());

        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));
        when(replyRepository.findByTicket_IdOrderByCreatedAtAsc(ticket.getId())).thenReturn(List.of(reply));

        TicketDetailResponse result = supportTicketService.getMyTicket(ticket.getId(), "alice@travelease.test");

        assertThat(result.ticket().ticketId()).isEqualTo(ticket.getId());
        assertThat(result.replies()).hasSize(1);
        assertThat(result.replies().get(0).message()).isEqualTo("We're looking into this.");
    }

    @Test
    void getMyTicketThrowsNotFoundWhenTicketBelongsToSomeoneElse() {
        User owner = sampleUser("alice@travelease.test");
        SupportTicket ticket = sampleTicket(owner);
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));

        assertThatThrownBy(() -> supportTicketService.getMyTicket(ticket.getId(), "bob@travelease.test"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getAllTicketsFiltersByCategoryAndStatusWhenBothProvided() {
        User user = sampleUser("alice@travelease.test");
        when(ticketRepository.findByCategoryAndStatusOrderByCreatedAtDesc(TicketCategory.HOTEL, TicketStatus.OPEN))
                .thenReturn(List.of(sampleTicket(user)));

        List<TicketResponse> result = supportTicketService.getAllTickets(TicketCategory.HOTEL, TicketStatus.OPEN);

        assertThat(result).hasSize(1);
    }

    @Test
    void getAllTicketsReturnsEveryTicketWhenNoFiltersProvided() {
        User user = sampleUser("alice@travelease.test");
        when(ticketRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(sampleTicket(user)));

        List<TicketResponse> result = supportTicketService.getAllTickets(null, null);

        assertThat(result).hasSize(1);
    }

    @Test
    void addReplySavesReplyAgainstTicket() {
        User user = sampleUser("alice@travelease.test");
        SupportTicket ticket = sampleTicket(user);
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));
        when(replyRepository.save(any(SupportTicketReply.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReplyResponse response =
                supportTicketService.addReply(ticket.getId(), new ReplyRequest("We're looking into this."));

        assertThat(response.message()).isEqualTo("We're looking into this.");
    }

    @Test
    void updateStatusChangesTicketStatus() {
        User user = sampleUser("alice@travelease.test");
        SupportTicket ticket = sampleTicket(user);
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any(SupportTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TicketResponse response =
                supportTicketService.updateStatus(ticket.getId(), new UpdateTicketStatusRequest(TicketStatus.RESOLVED));

        assertThat(response.status()).isEqualTo(TicketStatus.RESOLVED);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails to compile (the service classes don't exist yet)**

Run: `cd backend && ./mvnw -q test -Dtest=SupportTicketServiceImplTest`
Expected: Compilation failure — `SupportTicketService`/`SupportTicketServiceImpl` cannot be resolved.

- [ ] **Step 3: Create the `SupportTicketService` interface**

```java
package com.travelease.backend.support.service;

import com.travelease.backend.support.dto.CreateTicketRequest;
import com.travelease.backend.support.dto.ReplyRequest;
import com.travelease.backend.support.dto.ReplyResponse;
import com.travelease.backend.support.dto.TicketDetailResponse;
import com.travelease.backend.support.dto.TicketResponse;
import com.travelease.backend.support.dto.UpdateTicketStatusRequest;
import com.travelease.backend.support.entity.TicketCategory;
import com.travelease.backend.support.entity.TicketStatus;

import java.util.List;
import java.util.UUID;

public interface SupportTicketService {

    TicketResponse createTicket(CreateTicketRequest request, String currentUserEmail);

    List<TicketResponse> getMyTickets(String currentUserEmail);

    TicketDetailResponse getMyTicket(UUID ticketId, String currentUserEmail);

    List<TicketResponse> getAllTickets(TicketCategory category, TicketStatus status);

    TicketDetailResponse getTicketForAdmin(UUID ticketId);

    ReplyResponse addReply(UUID ticketId, ReplyRequest request);

    TicketResponse updateStatus(UUID ticketId, UpdateTicketStatusRequest request);
}
```

- [ ] **Step 4: Create the `SupportTicketServiceImpl` implementation**

```java
package com.travelease.backend.support.service;

import com.travelease.backend.auth.entity.User;
import com.travelease.backend.auth.repository.UserRepository;
import com.travelease.backend.shared.exception.ResourceNotFoundException;
import com.travelease.backend.support.dto.CreateTicketRequest;
import com.travelease.backend.support.dto.ReplyRequest;
import com.travelease.backend.support.dto.ReplyResponse;
import com.travelease.backend.support.dto.TicketDetailResponse;
import com.travelease.backend.support.dto.TicketResponse;
import com.travelease.backend.support.dto.UpdateTicketStatusRequest;
import com.travelease.backend.support.entity.SupportTicket;
import com.travelease.backend.support.entity.SupportTicketReply;
import com.travelease.backend.support.entity.TicketCategory;
import com.travelease.backend.support.entity.TicketStatus;
import com.travelease.backend.support.repository.SupportTicketReplyRepository;
import com.travelease.backend.support.repository.SupportTicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupportTicketServiceImpl implements SupportTicketService {

    private final SupportTicketRepository ticketRepository;
    private final SupportTicketReplyRepository replyRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public TicketResponse createTicket(CreateTicketRequest request, String currentUserEmail) {
        SupportTicket ticket = new SupportTicket();
        ticket.setUser(getCurrentUser(currentUserEmail));
        ticket.setCategory(request.category());
        ticket.setSubject(request.subject());
        ticket.setDescription(request.description());
        ticket.setStatus(TicketStatus.OPEN);
        return toTicketResponse(ticketRepository.save(ticket));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TicketResponse> getMyTickets(String currentUserEmail) {
        User user = getCurrentUser(currentUserEmail);
        return ticketRepository.findByUser_IdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::toTicketResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TicketDetailResponse getMyTicket(UUID ticketId, String currentUserEmail) {
        SupportTicket ticket = getTicket(ticketId);
        ensureOwner(ticket, currentUserEmail);
        return toDetailResponse(ticket);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TicketResponse> getAllTickets(TicketCategory category, TicketStatus status) {
        List<SupportTicket> tickets;
        if (category != null && status != null) {
            tickets = ticketRepository.findByCategoryAndStatusOrderByCreatedAtDesc(category, status);
        } else if (category != null) {
            tickets = ticketRepository.findByCategoryOrderByCreatedAtDesc(category);
        } else if (status != null) {
            tickets = ticketRepository.findByStatusOrderByCreatedAtDesc(status);
        } else {
            tickets = ticketRepository.findAllByOrderByCreatedAtDesc();
        }
        return tickets.stream().map(this::toTicketResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TicketDetailResponse getTicketForAdmin(UUID ticketId) {
        return toDetailResponse(getTicket(ticketId));
    }

    @Override
    @Transactional
    public ReplyResponse addReply(UUID ticketId, ReplyRequest request) {
        SupportTicket ticket = getTicket(ticketId);
        SupportTicketReply reply = new SupportTicketReply();
        reply.setTicket(ticket);
        reply.setMessage(request.message());
        return toReplyResponse(replyRepository.save(reply));
    }

    @Override
    @Transactional
    public TicketResponse updateStatus(UUID ticketId, UpdateTicketStatusRequest request) {
        SupportTicket ticket = getTicket(ticketId);
        ticket.setStatus(request.status());
        return toTicketResponse(ticketRepository.save(ticket));
    }

    private SupportTicket getTicket(UUID ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Support ticket with id " + ticketId + " not found"));
    }

    private void ensureOwner(SupportTicket ticket, String email) {
        if (!Objects.equals(ticket.getUser().getEmail(), email)) {
            throw new ResourceNotFoundException("Support ticket with id " + ticket.getId() + " not found");
        }
    }

    private User getCurrentUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User with email " + email + " not found"));
    }

    private TicketDetailResponse toDetailResponse(SupportTicket ticket) {
        List<ReplyResponse> replies = replyRepository.findByTicket_IdOrderByCreatedAtAsc(ticket.getId()).stream()
                .map(this::toReplyResponse)
                .toList();
        return new TicketDetailResponse(toTicketResponse(ticket), replies);
    }

    private TicketResponse toTicketResponse(SupportTicket ticket) {
        return new TicketResponse(
                ticket.getId(),
                ticket.getUser().getId(),
                ticket.getUser().getName(),
                ticket.getCategory(),
                ticket.getSubject(),
                ticket.getDescription(),
                ticket.getStatus(),
                ticket.getCreatedAt(),
                ticket.getUpdatedAt()
        );
    }

    private ReplyResponse toReplyResponse(SupportTicketReply reply) {
        return new ReplyResponse(reply.getId(), reply.getMessage(), reply.getCreatedAt());
    }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && ./mvnw -q test -Dtest=SupportTicketServiceImplTest`
Expected: `Tests run: 8, Failures: 0, Errors: 0` (all 8 tests pass).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/travelease/backend/support/service/ backend/src/test/java/com/travelease/backend/support/service/
git commit -m "feat(support): add SupportTicketService with create/list/reply/status-update logic"
```

---

## Task 5: Backend — `SupportTicketController` (user-facing)

**Files:**
- Create: `backend/src/main/java/com/travelease/backend/support/controller/SupportTicketController.java`

**Interfaces:**
- Consumes: `SupportTicketService` (Task 4), `CreateTicketRequest`/`TicketResponse`/`TicketDetailResponse` (Task 3), `com.travelease.backend.shared.dto.ApiResponse`.
- Produces: `POST /api/support/tickets`, `GET /api/support/tickets`, `GET /api/support/tickets/{ticketId}` — consumed by the frontend `SupportTicketService` in Task 7.

- [ ] **Step 1: Create the controller**

```java
package com.travelease.backend.support.controller;

import com.travelease.backend.shared.dto.ApiResponse;
import com.travelease.backend.support.dto.CreateTicketRequest;
import com.travelease.backend.support.dto.TicketDetailResponse;
import com.travelease.backend.support.dto.TicketResponse;
import com.travelease.backend.support.service.SupportTicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/support/tickets")
@RequiredArgsConstructor
public class SupportTicketController {

    private final SupportTicketService supportTicketService;

    @PostMapping
    public ResponseEntity<ApiResponse<TicketResponse>> createTicket(
            @Valid @RequestBody CreateTicketRequest request,
            Authentication authentication
    ) {
        TicketResponse response = supportTicketService.createTicket(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Support ticket created"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getMyTickets(Authentication authentication) {
        List<TicketResponse> response = supportTicketService.getMyTickets(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Support tickets retrieved"));
    }

    @GetMapping("/{ticketId}")
    public ResponseEntity<ApiResponse<TicketDetailResponse>> getMyTicket(
            @PathVariable UUID ticketId,
            Authentication authentication
    ) {
        TicketDetailResponse response = supportTicketService.getMyTicket(ticketId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Support ticket retrieved"));
    }
}
```

- [ ] **Step 2: Compile and run the full backend test suite to make sure nothing broke**

Run: `cd backend && ./mvnw -q test`
Expected: `BUILD SUCCESS`, all existing tests plus the 8 new `SupportTicketServiceImplTest` tests pass.

- [ ] **Step 3: Manually verify the endpoints with the app running**

Run: `cd backend && ./mvnw spring-boot:run` (in one terminal), then in another — register a fresh traveler account rather than relying on unknown seeded passwords (`backend/src/main/resources/seed_data.sql` has a seeded traveler at `traveler@travelease.com` but its plaintext password isn't recorded anywhere in the repo):
```bash
curl -s -X POST http://localhost:8080/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"QA Tester","email":"qa-support-test@travelease.test","phone":"9999999999","password":"Password123","securityQuestion":"Pet name?","securityAnswer":"Rex"}'
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"qa-support-test@travelease.test","password":"Password123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")
curl -s -X POST http://localhost:8080/api/support/tickets -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"category":"HOTEL","subject":"Room was dirty","description":"Not cleaned before check-in."}'
curl -s http://localhost:8080/api/support/tickets -H "Authorization: Bearer $TOKEN"
```
Expected: the `POST /api/support/tickets` call returns `"success":true` with the created ticket (`"status":"OPEN"`); the following `GET` call returns a list containing that ticket. Stop the running app afterward.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/travelease/backend/support/controller/SupportTicketController.java
git commit -m "feat(support): add user-facing support ticket endpoints"
```

---

## Task 6: Backend — `AdminSupportTicketController` (admin-facing)

**Files:**
- Create: `backend/src/main/java/com/travelease/backend/support/controller/AdminSupportTicketController.java`

**Interfaces:**
- Consumes: `SupportTicketService` (Task 4), `ReplyRequest`/`ReplyResponse`/`TicketDetailResponse`/`TicketResponse`/`UpdateTicketStatusRequest` (Task 3), `TicketCategory`/`TicketStatus` (Task 1).
- Produces: `GET /api/admin/support/tickets?category=&status=`, `GET /api/admin/support/tickets/{ticketId}`, `POST /api/admin/support/tickets/{ticketId}/replies`, `PATCH /api/admin/support/tickets/{ticketId}/status` — consumed by the frontend `SupportTicketService` in Task 7 (used by the admin component in Task 11).

- [ ] **Step 1: Create the controller**

```java
package com.travelease.backend.support.controller;

import com.travelease.backend.shared.dto.ApiResponse;
import com.travelease.backend.support.dto.ReplyRequest;
import com.travelease.backend.support.dto.ReplyResponse;
import com.travelease.backend.support.dto.TicketDetailResponse;
import com.travelease.backend.support.dto.TicketResponse;
import com.travelease.backend.support.dto.UpdateTicketStatusRequest;
import com.travelease.backend.support.entity.TicketCategory;
import com.travelease.backend.support.entity.TicketStatus;
import com.travelease.backend.support.service.SupportTicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/support/tickets")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminSupportTicketController {

    private final SupportTicketService supportTicketService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getAllTickets(
            @RequestParam(required = false) TicketCategory category,
            @RequestParam(required = false) TicketStatus status
    ) {
        List<TicketResponse> response = supportTicketService.getAllTickets(category, status);
        return ResponseEntity.ok(ApiResponse.success(response, "Support tickets retrieved"));
    }

    @GetMapping("/{ticketId}")
    public ResponseEntity<ApiResponse<TicketDetailResponse>> getTicket(@PathVariable UUID ticketId) {
        TicketDetailResponse response = supportTicketService.getTicketForAdmin(ticketId);
        return ResponseEntity.ok(ApiResponse.success(response, "Support ticket retrieved"));
    }

    @PostMapping("/{ticketId}/replies")
    public ResponseEntity<ApiResponse<ReplyResponse>> addReply(
            @PathVariable UUID ticketId,
            @Valid @RequestBody ReplyRequest request
    ) {
        ReplyResponse response = supportTicketService.addReply(ticketId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Reply added"));
    }

    @PatchMapping("/{ticketId}/status")
    public ResponseEntity<ApiResponse<TicketResponse>> updateStatus(
            @PathVariable UUID ticketId,
            @Valid @RequestBody UpdateTicketStatusRequest request
    ) {
        TicketResponse response = supportTicketService.updateStatus(ticketId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Support ticket status updated"));
    }
}
```

- [ ] **Step 2: Run the full backend test suite**

Run: `cd backend && ./mvnw -q test`
Expected: `BUILD SUCCESS`, no regressions.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/travelease/backend/support/controller/AdminSupportTicketController.java
git commit -m "feat(support): add admin support ticket endpoints"
```

---

## Task 7: Frontend — `support-ticket.models.ts` + `support-ticket.service.ts` + service spec

**Files:**
- Create: `frontend/src/app/features/support/services/support-ticket.models.ts`
- Create: `frontend/src/app/features/support/services/support-ticket.service.ts`
- Test: `frontend/src/app/features/support/services/support-ticket.service.spec.ts`

**Interfaces:**
- Consumes: `API_BASE_URL` from `@app/core/api/api-config`, `ApiResponse<T>` from `@app/core/api/api-response.model`.
- Produces: `TicketCategory`, `TicketStatus`, `TicketReply`, `SupportTicket`, `SupportTicketDetail`, `CreateTicketPayload` types; `SupportTicketService` with `createTicket`, `getMyTickets`, `getMyTicket`, `getAllTickets`, `getTicketForAdmin`, `addReply`, `updateStatus` — consumed by Tasks 8–11 (all support components).

- [ ] **Step 1: Create the models file**

```typescript
export type TicketCategory = 'BUS' | 'HOTEL' | 'ACTIVITY' | 'TRIP' | 'OTHER';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface TicketReply {
  replyId: string;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  ticketId: string;
  userId: string;
  userName: string;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketDetail {
  ticket: SupportTicket;
  replies: TicketReply[];
}

export interface CreateTicketPayload {
  category: TicketCategory;
  subject: string;
  description: string;
}
```

- [ ] **Step 2: Create the service**

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { ApiResponse } from '@app/core/api/api-response.model';
import {
  CreateTicketPayload,
  SupportTicket,
  SupportTicketDetail,
  TicketCategory,
  TicketReply,
  TicketStatus,
} from '@app/features/support/services/support-ticket.models';

@Injectable({ providedIn: 'root' })
export class SupportTicketService {
  private readonly http = inject(HttpClient);

  createTicket(payload: CreateTicketPayload): Observable<SupportTicket> {
    return this.http
      .post<ApiResponse<SupportTicket>>(`${API_BASE_URL}/api/support/tickets`, payload)
      .pipe(map((response) => response.data));
  }

  getMyTickets(): Observable<SupportTicket[]> {
    return this.http
      .get<ApiResponse<SupportTicket[]>>(`${API_BASE_URL}/api/support/tickets`)
      .pipe(map((response) => response.data));
  }

  getMyTicket(ticketId: string): Observable<SupportTicketDetail> {
    return this.http
      .get<ApiResponse<SupportTicketDetail>>(`${API_BASE_URL}/api/support/tickets/${ticketId}`)
      .pipe(map((response) => response.data));
  }

  getAllTickets(category?: TicketCategory, status?: TicketStatus): Observable<SupportTicket[]> {
    let params = new HttpParams();
    if (category) {
      params = params.set('category', category);
    }
    if (status) {
      params = params.set('status', status);
    }
    return this.http
      .get<ApiResponse<SupportTicket[]>>(`${API_BASE_URL}/api/admin/support/tickets`, { params })
      .pipe(map((response) => response.data));
  }

  getTicketForAdmin(ticketId: string): Observable<SupportTicketDetail> {
    return this.http
      .get<ApiResponse<SupportTicketDetail>>(`${API_BASE_URL}/api/admin/support/tickets/${ticketId}`)
      .pipe(map((response) => response.data));
  }

  addReply(ticketId: string, message: string): Observable<TicketReply> {
    return this.http
      .post<ApiResponse<TicketReply>>(`${API_BASE_URL}/api/admin/support/tickets/${ticketId}/replies`, { message })
      .pipe(map((response) => response.data));
  }

  updateStatus(ticketId: string, status: TicketStatus): Observable<SupportTicket> {
    return this.http
      .patch<ApiResponse<SupportTicket>>(`${API_BASE_URL}/api/admin/support/tickets/${ticketId}/status`, { status })
      .pipe(map((response) => response.data));
  }
}
```

- [ ] **Step 3: Write the service spec**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import { CreateTicketPayload, SupportTicket } from '@app/features/support/services/support-ticket.models';

const SAMPLE_TICKET: SupportTicket = {
  ticketId: 'aaaaaaaa-0000-0000-0000-000000000001',
  userId: 'bbbbbbbb-0000-0000-0000-000000000002',
  userName: 'Alice Traveler',
  category: 'HOTEL',
  subject: 'Room was dirty',
  description: 'Not cleaned before check-in.',
  status: 'OPEN',
  createdAt: '2026-07-09T00:00:00Z',
  updatedAt: '2026-07-09T00:00:00Z',
};

describe('SupportTicketService', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return {
      service: TestBed.inject(SupportTicketService),
      httpMock: TestBed.inject(HttpTestingController),
    };
  }

  it('creates a ticket and unwraps the response', async () => {
    const { service, httpMock } = await setup();

    const payload: CreateTicketPayload = {
      category: 'HOTEL',
      subject: 'Room was dirty',
      description: 'Not cleaned before check-in.',
    };

    let result: SupportTicket | undefined;
    service.createTicket(payload).subscribe((ticket) => (result = ticket));

    const req = httpMock.expectOne('http://localhost:8080/api/support/tickets');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true, data: SAMPLE_TICKET, message: 'Support ticket created', error: null });

    expect(result).toEqual(SAMPLE_TICKET);
  });

  it('fetches the current user\'s tickets', async () => {
    const { service, httpMock } = await setup();

    let result: SupportTicket[] | undefined;
    service.getMyTickets().subscribe((tickets) => (result = tickets));

    const req = httpMock.expectOne('http://localhost:8080/api/support/tickets');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [SAMPLE_TICKET], message: 'Support tickets retrieved', error: null });

    expect(result).toEqual([SAMPLE_TICKET]);
  });

  it('fetches all tickets with category and status query params', async () => {
    const { service, httpMock } = await setup();

    let result: SupportTicket[] | undefined;
    service.getAllTickets('HOTEL', 'OPEN').subscribe((tickets) => (result = tickets));

    const req = httpMock.expectOne(
      'http://localhost:8080/api/admin/support/tickets?category=HOTEL&status=OPEN',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [SAMPLE_TICKET], message: 'Support tickets retrieved', error: null });

    expect(result).toEqual([SAMPLE_TICKET]);
  });

  it('fetches all tickets with no query params when no filters are given', async () => {
    const { service, httpMock } = await setup();

    service.getAllTickets().subscribe();

    const req = httpMock.expectOne('http://localhost:8080/api/admin/support/tickets');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [], message: 'Support tickets retrieved', error: null });
  });

  it('posts a reply and unwraps the response', async () => {
    const { service, httpMock } = await setup();

    let result: unknown;
    service.addReply(SAMPLE_TICKET.ticketId, 'We are looking into this.').subscribe((reply) => (result = reply));

    const req = httpMock.expectOne(
      `http://localhost:8080/api/admin/support/tickets/${SAMPLE_TICKET.ticketId}/replies`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ message: 'We are looking into this.' });
    req.flush({
      success: true,
      data: { replyId: 'r1', message: 'We are looking into this.', createdAt: '2026-07-09T01:00:00Z' },
      message: 'Reply added',
      error: null,
    });

    expect(result).toEqual({ replyId: 'r1', message: 'We are looking into this.', createdAt: '2026-07-09T01:00:00Z' });
  });

  it('patches the status and unwraps the response', async () => {
    const { service, httpMock } = await setup();

    let result: SupportTicket | undefined;
    service.updateStatus(SAMPLE_TICKET.ticketId, 'RESOLVED').subscribe((ticket) => (result = ticket));

    const req = httpMock.expectOne(
      `http://localhost:8080/api/admin/support/tickets/${SAMPLE_TICKET.ticketId}/status`,
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'RESOLVED' });
    req.flush({
      success: true,
      data: { ...SAMPLE_TICKET, status: 'RESOLVED' },
      message: 'Support ticket status updated',
      error: null,
    });

    expect(result).toEqual({ ...SAMPLE_TICKET, status: 'RESOLVED' });
  });
});
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `cd frontend && npx ng test --watch=false --include='**/support-ticket.service.spec.ts'`
Expected: 6 tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/support/services/
git commit -m "feat(support): add SupportTicketService and models for the frontend"
```

---

## Task 8: Frontend — `raise-ticket-form` component

**Files:**
- Create: `frontend/src/app/features/support/components/raise-ticket-form/raise-ticket-form.ts`
- Create: `frontend/src/app/features/support/components/raise-ticket-form/raise-ticket-form.html`
- Test: `frontend/src/app/features/support/components/raise-ticket-form/raise-ticket-form.spec.ts`

**Interfaces:**
- Consumes: `SupportTicketService.createTicket` (Task 7), `PageHeader` (`@app/shared/ui/page-header/page-header`).
- Produces: `RaiseTicketForm` standalone component, selector `app-raise-ticket-form` — consumed by `support.routes.ts` in Task 12.

- [ ] **Step 1: Write the failing component spec**

```typescript
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { RaiseTicketForm } from '@app/features/support/components/raise-ticket-form/raise-ticket-form';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import { CreateTicketPayload, SupportTicket } from '@app/features/support/services/support-ticket.models';

const CREATED_TICKET: SupportTicket = {
  ticketId: 'aaaaaaaa-0000-0000-0000-000000000001',
  userId: 'bbbbbbbb-0000-0000-0000-000000000002',
  userName: 'Alice Traveler',
  category: 'OTHER',
  subject: 'App keeps crashing',
  description: 'The app crashes every time I open trip details.',
  status: 'OPEN',
  createdAt: '2026-07-09T00:00:00Z',
  updatedAt: '2026-07-09T00:00:00Z',
};

async function setup(supportTicketService: Partial<SupportTicketService>) {
  await TestBed.configureTestingModule({
    imports: [RaiseTicketForm],
    providers: [
      provideRouter([]),
      provideIcons({ lucideArrowLeft }),
      { provide: SupportTicketService, useValue: supportTicketService },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(RaiseTicketForm);
  const router = TestBed.inject(Router);
  const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  fixture.detectChanges();
  return { fixture, navigateSpy };
}

function fillAndSubmit(el: HTMLElement, subject: string, description: string) {
  (el.querySelector('#subject') as HTMLInputElement).value = subject;
  (el.querySelector('#description') as HTMLTextAreaElement).value = description;
  const form = el.querySelector('form')!;
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

describe('RaiseTicketForm', () => {
  it('submits the ticket with the selected category and navigates to My Tickets', async () => {
    const createTicket = vi.fn().mockReturnValue(of(CREATED_TICKET));
    const { fixture, navigateSpy } = await setup({ createTicket });
    const el = fixture.nativeElement as HTMLElement;

    fillAndSubmit(el, 'App keeps crashing', 'The app crashes every time I open trip details.');
    await fixture.whenStable();
    fixture.detectChanges();

    const expectedPayload: CreateTicketPayload = {
      category: 'OTHER',
      subject: 'App keeps crashing',
      description: 'The app crashes every time I open trip details.',
    };
    expect(createTicket).toHaveBeenCalledWith(expectedPayload);
    expect(navigateSpy).toHaveBeenCalledWith(['/support/tickets']);
  });

  it('shows a validation error and does not submit when the fields are blank', async () => {
    const createTicket = vi.fn();
    const { fixture } = await setup({ createTicket });
    const el = fixture.nativeElement as HTMLElement;

    fillAndSubmit(el, '', '');
    fixture.detectChanges();

    expect(createTicket).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Please fill in both the subject and description.');
  });

  it('shows the server error message and does not navigate on failure', async () => {
    const httpError = new HttpErrorResponse({
      status: 400,
      error: { success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Subject is required' } },
    });
    const createTicket = vi.fn().mockReturnValue(throwError(() => httpError));
    const { fixture, navigateSpy } = await setup({ createTicket });
    const el = fixture.nativeElement as HTMLElement;

    fillAndSubmit(el, 'Subject', 'Description');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.textContent).toContain('Subject is required');
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails (component doesn't exist yet)**

Run: `cd frontend && npx ng test --watch=false --include='**/raise-ticket-form.spec.ts'`
Expected: Fails to resolve `@app/features/support/components/raise-ticket-form/raise-ticket-form`.

- [ ] **Step 3: Create the component class**

```typescript
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import { CreateTicketPayload, TicketCategory } from '@app/features/support/services/support-ticket.models';

interface CategoryOption {
  value: TicketCategory;
  label: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: 'BUS', label: 'Bus' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'ACTIVITY', label: 'Activity' },
  { value: 'TRIP', label: 'Trip / General' },
  { value: 'OTHER', label: 'Other' },
];

@Component({
  selector: 'app-raise-ticket-form',
  imports: [
    RouterLink,
    NgIcon,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSelectImports,
    HlmTextareaImports,
    PageHeader,
  ],
  templateUrl: './raise-ticket-form.html',
})
export class RaiseTicketForm {
  private readonly router = inject(Router);
  private readonly supportTicketService = inject(SupportTicketService);

  protected readonly categoryOptions = CATEGORY_OPTIONS;
  protected readonly category = signal<TicketCategory>('OTHER');
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly categoryLabel = (value: string): string =>
    this.categoryOptions.find((option) => option.value === value)?.label ?? value;

  protected onCategoryChange(value: string | null | undefined): void {
    if (value) {
      this.category.set(value as TicketCategory);
    }
  }

  protected onSubmit(event: Event, subject: string, description: string): void {
    event.preventDefault();
    this.error.set(null);

    if (!subject.trim() || !description.trim()) {
      this.error.set('Please fill in both the subject and description.');
      return;
    }

    const payload: CreateTicketPayload = {
      category: this.category(),
      subject,
      description,
    };

    this.submitting.set(true);
    this.supportTicketService.createTicket(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/support/tickets']);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.error.set(this.extractErrorMessage(err));
      },
    });
  }

  private extractErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.error?.error) {
      return err.error.error.message;
    }
    return 'Something went wrong submitting your ticket. Please try again.';
  }
}
```

- [ ] **Step 4: Create the template**

```html
<a hlmBtn variant="ghost" size="sm" class="mb-3" routerLink="/dashboard">
  <ng-icon name="lucideArrowLeft" class="h-4 w-4 mr-1" />Back to dashboard
</a>
<app-page-header
  title="Contact Support"
  subtitle="Tell us what went wrong and our team will get back to you."
/>

<div hlmCard class="max-w-2xl">
  <div hlmCardContent class="pt-6">
    <form class="space-y-4" (submit)="onSubmit($event, subjectInput.value, descriptionInput.value)">
      <div class="space-y-2">
        <label hlmLabel>What is this about?</label>
        <hlm-select [value]="category()" [itemToString]="categoryLabel" (valueChange)="onCategoryChange($event)">
          <hlm-select-trigger><hlm-select-value /></hlm-select-trigger>
          <ng-template hlmSelectPortal>
            <hlm-select-content>
              @for (option of categoryOptions; track option.value) {
                <hlm-select-item [value]="option.value">{{ option.label }}</hlm-select-item>
              }
            </hlm-select-content>
          </ng-template>
        </hlm-select>
      </div>
      <div class="space-y-2">
        <label hlmLabel for="subject">Subject</label>
        <input hlmInput id="subject" placeholder="Briefly describe the issue" #subjectInput />
      </div>
      <div class="space-y-2">
        <label hlmLabel for="description">Description</label>
        <textarea
          hlmTextarea
          id="description"
          class="w-full min-h-32"
          placeholder="Give us the details so we can help"
          #descriptionInput
        ></textarea>
      </div>
      @if (error()) {
        <p class="text-xs text-destructive">{{ error() }}</p>
      }
      <div class="flex gap-3 pt-2">
        <button hlmBtn type="submit" [disabled]="submitting()">Submit Ticket</button>
        <a hlmBtn variant="outline" routerLink="/support/tickets">View My Tickets</a>
      </div>
    </form>
  </div>
</div>
```

- [ ] **Step 5: Run the spec to verify it passes**

Run: `cd frontend && npx ng test --watch=false --include='**/raise-ticket-form.spec.ts'`
Expected: 3 tests pass, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/support/components/raise-ticket-form/
git commit -m "feat(support): add the Contact Support (raise ticket) form"
```

---

## Task 9: Frontend — `my-tickets` component

**Files:**
- Create: `frontend/src/app/features/support/components/my-tickets/my-tickets.ts`
- Create: `frontend/src/app/features/support/components/my-tickets/my-tickets.html`
- Test: `frontend/src/app/features/support/components/my-tickets/my-tickets.spec.ts`
- Modify: `frontend/src/app/shared/ui/status-badge/status-badge.ts`

**Interfaces:**
- Consumes: `SupportTicketService.getMyTickets` (Task 7), `PageHeader`, `StatusBadge` (`@app/shared/ui/status-badge/status-badge`).
- Produces: `MyTickets` standalone component, selector `app-my-tickets` — consumed by `support.routes.ts` in Task 12. Also extends `StatusBadge`'s color map with the four `TicketStatus` values, reused by Task 10 and Task 11.

- [ ] **Step 1: Extend `StatusBadge`'s color map with the support ticket statuses**

In `frontend/src/app/shared/ui/status-badge/status-badge.ts`, add these four entries to `STATUS_CLASS_MAP` (after the existing `REJECTED` entry):

```typescript
  REJECTED: 'bg-destructive/15 text-destructive border-destructive/20',
  OPEN: 'bg-primary/10 text-primary border-primary/20',
  IN_PROGRESS: 'bg-warning/15 text-[oklch(0.45_0.12_75)] border-warning/20',
  RESOLVED: 'bg-success/10 text-success border-success/20',
  CLOSED: 'bg-muted text-muted-foreground border-border',
};
```

- [ ] **Step 2: Write the failing component spec**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucidePlus } from '@ng-icons/lucide';
import { of, throwError } from 'rxjs';
import { MyTickets } from '@app/features/support/components/my-tickets/my-tickets';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import { SupportTicket } from '@app/features/support/services/support-ticket.models';

const TICKETS: SupportTicket[] = [
  {
    ticketId: 'aaaaaaaa-0000-0000-0000-000000000001',
    userId: 'u1',
    userName: 'Alice Traveler',
    category: 'HOTEL',
    subject: 'Room was dirty',
    description: 'Not cleaned before check-in.',
    status: 'OPEN',
    createdAt: '2026-07-09T00:00:00Z',
    updatedAt: '2026-07-09T00:00:00Z',
  },
];

async function setup(getMyTickets: () => ReturnType<SupportTicketService['getMyTickets']>) {
  await TestBed.configureTestingModule({
    imports: [MyTickets],
    providers: [
      provideRouter([]),
      provideIcons({ lucidePlus }),
      { provide: SupportTicketService, useValue: { getMyTickets } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(MyTickets);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture };
}

describe('MyTickets', () => {
  it('renders every ticket returned by the service', async () => {
    const { fixture } = await setup(() => of(TICKETS));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Room was dirty');
    expect(text).toContain('OPEN');
  });

  it('shows an empty state when there are no tickets', async () => {
    const { fixture } = await setup(() => of([]));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain("You haven't raised any support tickets yet.");
  });

  it('shows an error state when the request fails', async () => {
    const { fixture } = await setup(() => throwError(() => new Error('boom')));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Could not load your tickets.');
  });
});
```

- [ ] **Step 3: Run the spec to verify it fails**

Run: `cd frontend && npx ng test --watch=false --include='**/my-tickets.spec.ts'`
Expected: Fails to resolve the `MyTickets` component.

- [ ] **Step 4: Create the component class**

```typescript
import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import { SupportTicket } from '@app/features/support/services/support-ticket.models';

@Component({
  selector: 'app-my-tickets',
  imports: [DatePipe, RouterLink, NgIcon, HlmButtonImports, HlmCardImports, PageHeader, StatusBadge],
  templateUrl: './my-tickets.html',
})
export class MyTickets {
  private readonly supportTicketService = inject(SupportTicketService);

  protected readonly tickets = signal<SupportTicket[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  constructor() {
    this.supportTicketService.getMyTickets().subscribe({
      next: (tickets) => {
        this.tickets.set(tickets);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
```

- [ ] **Step 5: Create the template**

```html
<app-page-header title="My Tickets" subtitle="Track the support tickets you've raised.">
  <a action hlmBtn routerLink="/support/contact">
    <ng-icon name="lucidePlus" class="h-4 w-4 mr-1" /> New Ticket
  </a>
</app-page-header>

@if (loading()) {
  <p class="text-sm text-muted-foreground py-6">Loading your tickets…</p>
} @else if (error()) {
  <p class="text-sm text-destructive py-6">Could not load your tickets. Please try again.</p>
} @else if (tickets().length === 0) {
  <div hlmCard class="mt-4">
    <div hlmCardContent class="pt-6 text-center text-sm text-muted-foreground">
      You haven't raised any support tickets yet.
    </div>
  </div>
} @else {
  <div class="mt-4 space-y-3">
    @for (ticket of tickets(); track ticket.ticketId) {
      <a
        [routerLink]="['/support/tickets', ticket.ticketId]"
        hlmCard
        class="block p-4 hover:bg-accent/5 transition-colors"
      >
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="font-medium">{{ ticket.subject }}</p>
            <p class="text-xs text-muted-foreground mt-1">
              {{ ticket.category }} · Raised {{ ticket.createdAt | date: 'mediumDate' }}
            </p>
          </div>
          <app-status-badge [status]="ticket.status" />
        </div>
      </a>
    }
  </div>
}
```

- [ ] **Step 6: Run the spec to verify it passes**

Run: `cd frontend && npx ng test --watch=false --include='**/my-tickets.spec.ts'`
Expected: 3 tests pass, 0 failures.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/features/support/components/my-tickets/ frontend/src/app/shared/ui/status-badge/status-badge.ts
git commit -m "feat(support): add My Tickets list and support-ticket status colors"
```

---

## Task 10: Frontend — `ticket-detail` component

**Files:**
- Create: `frontend/src/app/features/support/components/ticket-detail/ticket-detail.ts`
- Create: `frontend/src/app/features/support/components/ticket-detail/ticket-detail.html`
- Test: `frontend/src/app/features/support/components/ticket-detail/ticket-detail.spec.ts`

**Interfaces:**
- Consumes: `SupportTicketService.getMyTicket` (Task 7), `ActivatedRoute` (route param `id`), `PageHeader`, `StatusBadge` (colors extended in Task 9).
- Produces: `TicketDetail` standalone component, selector `app-ticket-detail` — consumed by `support.routes.ts` in Task 12.

- [ ] **Step 1: Write the failing component spec**

```typescript
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import { of, throwError } from 'rxjs';
import { TicketDetail } from '@app/features/support/components/ticket-detail/ticket-detail';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import { SupportTicketDetail } from '@app/features/support/services/support-ticket.models';

const DETAIL: SupportTicketDetail = {
  ticket: {
    ticketId: 'aaaaaaaa-0000-0000-0000-000000000001',
    userId: 'u1',
    userName: 'Alice Traveler',
    category: 'HOTEL',
    subject: 'Room was dirty',
    description: 'Not cleaned before check-in.',
    status: 'IN_PROGRESS',
    createdAt: '2026-07-09T00:00:00Z',
    updatedAt: '2026-07-09T01:00:00Z',
  },
  replies: [{ replyId: 'r1', message: "We're looking into this.", createdAt: '2026-07-09T01:00:00Z' }],
};

async function setup(getMyTicket: () => ReturnType<SupportTicketService['getMyTicket']>, ticketId = DETAIL.ticket.ticketId) {
  await TestBed.configureTestingModule({
    imports: [TicketDetail],
    providers: [
      provideRouter([]),
      provideIcons({ lucideArrowLeft }),
      { provide: SupportTicketService, useValue: { getMyTicket } },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: ticketId }) } },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(TicketDetail);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture };
}

describe('TicketDetail', () => {
  it('renders the ticket description, status, and replies', async () => {
    const { fixture } = await setup(() => of(DETAIL));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Room was dirty');
    expect(text).toContain('Not cleaned before check-in.');
    expect(text).toContain('IN_PROGRESS');
    expect(text).toContain("We're looking into this.");
  });

  it('shows a not-found state when the ticket cannot be loaded', async () => {
    const { fixture } = await setup(() => throwError(() => new Error('404')));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ticket not found.');
  });

  it('shows a no-replies message when the thread is empty', async () => {
    const { fixture } = await setup(() => of({ ...DETAIL, replies: [] }));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No replies yet.');
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `cd frontend && npx ng test --watch=false --include='**/ticket-detail.spec.ts'`
Expected: Fails to resolve the `TicketDetail` component.

- [ ] **Step 3: Create the component class**

```typescript
import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import { SupportTicketDetail } from '@app/features/support/services/support-ticket.models';

@Component({
  selector: 'app-ticket-detail',
  imports: [DatePipe, RouterLink, NgIcon, HlmButtonImports, HlmCardImports, PageHeader, StatusBadge],
  templateUrl: './ticket-detail.html',
})
export class TicketDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly supportTicketService = inject(SupportTicketService);

  protected readonly detail = signal<SupportTicketDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);

  constructor() {
    const ticketId = this.route.snapshot.paramMap.get('id');
    if (!ticketId) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    this.supportTicketService.getMyTicket(ticketId).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }
}
```

- [ ] **Step 4: Create the template**

```html
<a hlmBtn variant="ghost" size="sm" class="mb-3" routerLink="/support/tickets">
  <ng-icon name="lucideArrowLeft" class="h-4 w-4 mr-1" />Back to my tickets
</a>

@if (loading()) {
  <p class="text-sm text-muted-foreground py-6">Loading ticket…</p>
} @else if (notFound()) {
  <p class="text-sm text-destructive py-6">Ticket not found.</p>
} @else if (detail(); as d) {
  <app-page-header [title]="d.ticket.subject" [subtitle]="d.ticket.category + ' · Raised ' + (d.ticket.createdAt | date: 'medium')" />
  <div class="flex items-center gap-2 mt-2">
    <app-status-badge [status]="d.ticket.status" />
  </div>

  <div hlmCard class="mt-4">
    <div hlmCardContent class="pt-6">
      <p class="text-sm whitespace-pre-line">{{ d.ticket.description }}</p>
    </div>
  </div>

  <h2 class="text-sm font-semibold mt-6 mb-2">Replies</h2>
  @if (d.replies.length === 0) {
    <p class="text-sm text-muted-foreground">No replies yet.</p>
  } @else {
    <div class="space-y-3">
      @for (reply of d.replies; track reply.replyId) {
        <div hlmCard class="p-4">
          <p class="text-sm">{{ reply.message }}</p>
          <p class="text-xs text-muted-foreground mt-2">{{ reply.createdAt | date: 'medium' }}</p>
        </div>
      }
    </div>
  }
}
```

- [ ] **Step 5: Run the spec to verify it passes**

Run: `cd frontend && npx ng test --watch=false --include='**/ticket-detail.spec.ts'`
Expected: 3 tests pass, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/support/components/ticket-detail/
git commit -m "feat(support): add the ticket detail (read-only reply thread) view"
```

---

## Task 11: Frontend — `admin-support-tickets` component

**Files:**
- Create: `frontend/src/app/features/admin/components/admin-support-tickets/admin-support-tickets.ts`
- Create: `frontend/src/app/features/admin/components/admin-support-tickets/admin-support-tickets.html`
- Test: `frontend/src/app/features/admin/components/admin-support-tickets/admin-support-tickets.spec.ts`

**Interfaces:**
- Consumes: `SupportTicketService.getAllTickets`/`getTicketForAdmin`/`addReply`/`updateStatus` (Task 7), `PageHeader`, `StatusBadge`.
- Produces: `AdminSupportTickets` standalone component, selector `app-admin-support-tickets` — consumed by `admin.routes.ts` in Task 12.

- [ ] **Step 1: Write the failing component spec**

```typescript
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminSupportTickets } from '@app/features/admin/components/admin-support-tickets/admin-support-tickets';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import { SupportTicket, SupportTicketDetail } from '@app/features/support/services/support-ticket.models';

const TICKET: SupportTicket = {
  ticketId: 'aaaaaaaa-0000-0000-0000-000000000001',
  userId: 'u1',
  userName: 'Alice Traveler',
  category: 'HOTEL',
  subject: 'Room was dirty',
  description: 'Not cleaned before check-in.',
  status: 'OPEN',
  createdAt: '2026-07-09T00:00:00Z',
  updatedAt: '2026-07-09T00:00:00Z',
};

const DETAIL: SupportTicketDetail = { ticket: TICKET, replies: [] };

async function setup() {
  const getAllTickets = vi.fn().mockReturnValue(of([TICKET]));
  const getTicketForAdmin = vi.fn().mockReturnValue(of(DETAIL));
  const addReply = vi.fn().mockReturnValue(of({ replyId: 'r1', message: 'On it', createdAt: '2026-07-09T02:00:00Z' }));
  const updateStatus = vi.fn().mockReturnValue(of({ ...TICKET, status: 'RESOLVED' }));

  await TestBed.configureTestingModule({
    imports: [AdminSupportTickets],
    providers: [
      {
        provide: SupportTicketService,
        useValue: { getAllTickets, getTicketForAdmin, addReply, updateStatus },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(AdminSupportTickets);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, getAllTickets, getTicketForAdmin, addReply, updateStatus };
}

describe('AdminSupportTickets', () => {
  it('loads and renders all tickets on init with no filters', async () => {
    const { fixture, getAllTickets } = await setup();
    expect(getAllTickets).toHaveBeenCalledWith(undefined, undefined);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Room was dirty');
    expect(text).toContain('Alice Traveler');
  });

  it('loads a ticket detail panel when a ticket row is clicked', async () => {
    const { fixture, getTicketForAdmin } = await setup();
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('button') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getTicketForAdmin).toHaveBeenCalledWith(TICKET.ticketId);
    expect(el.textContent).toContain('Room was dirty');
    expect(el.textContent).not.toContain('Select a ticket to view details.');
  });

  it('posts a reply and appends it to the thread', async () => {
    const { fixture, addReply } = await setup();
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('button') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    const textarea = el.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'On it';
    const form = el.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(addReply).toHaveBeenCalledWith(TICKET.ticketId, 'On it');
    expect(el.textContent).toContain('On it');
  });

  it('updates the ticket status and refreshes the list', async () => {
    const { fixture, updateStatus, getAllTickets } = await setup();
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('button') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    getAllTickets.mockClear();

    (fixture.componentInstance as unknown as { onStatusChange: (v: string) => void }).onStatusChange('RESOLVED');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(updateStatus).toHaveBeenCalledWith(TICKET.ticketId, 'RESOLVED');
    expect(getAllTickets).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `cd frontend && npx ng test --watch=false --include='**/admin-support-tickets.spec.ts'`
Expected: Fails to resolve the `AdminSupportTickets` component.

- [ ] **Step 3: Create the component class**

```typescript
import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { StatusBadge } from '@app/shared/ui/status-badge/status-badge';
import { SupportTicketService } from '@app/features/support/services/support-ticket.service';
import {
  SupportTicket,
  SupportTicketDetail,
  TicketCategory,
  TicketStatus,
} from '@app/features/support/services/support-ticket.models';

interface FilterOption<T> {
  value: T | 'ALL';
  label: string;
}

const CATEGORY_FILTERS: FilterOption<TicketCategory>[] = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'BUS', label: 'Bus' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'ACTIVITY', label: 'Activity' },
  { value: 'TRIP', label: 'Trip / General' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_FILTERS: FilterOption<TicketStatus>[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const STATUS_OPTIONS: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

@Component({
  selector: 'app-admin-support-tickets',
  imports: [DatePipe, HlmButtonImports, HlmCardImports, HlmSelectImports, HlmTextareaImports, PageHeader, StatusBadge],
  templateUrl: './admin-support-tickets.html',
})
export class AdminSupportTickets {
  private readonly supportTicketService = inject(SupportTicketService);

  protected readonly categoryFilters = CATEGORY_FILTERS;
  protected readonly statusFilters = STATUS_FILTERS;
  protected readonly statusOptions = STATUS_OPTIONS;

  protected readonly categoryFilter = signal<TicketCategory | 'ALL'>('ALL');
  protected readonly statusFilter = signal<TicketStatus | 'ALL'>('ALL');
  protected readonly tickets = signal<SupportTicket[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  protected readonly selectedDetail = signal<SupportTicketDetail | null>(null);
  protected readonly detailLoading = signal(false);
  protected readonly replyError = signal<string | null>(null);
  protected readonly replySubmitting = signal(false);

  constructor() {
    this.loadTickets();
  }

  protected onCategoryFilterChange(value: string | null | undefined): void {
    if (value) {
      this.categoryFilter.set(value as TicketCategory | 'ALL');
      this.loadTickets();
    }
  }

  protected onStatusFilterChange(value: string | null | undefined): void {
    if (value) {
      this.statusFilter.set(value as TicketStatus | 'ALL');
      this.loadTickets();
    }
  }

  protected selectTicket(ticketId: string): void {
    this.detailLoading.set(true);
    this.replyError.set(null);
    this.supportTicketService.getTicketForAdmin(ticketId).subscribe({
      next: (detail) => {
        this.selectedDetail.set(detail);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailLoading.set(false);
      },
    });
  }

  protected onStatusChange(value: string | null | undefined): void {
    const detail = this.selectedDetail();
    if (!value || !detail) {
      return;
    }
    this.supportTicketService.updateStatus(detail.ticket.ticketId, value as TicketStatus).subscribe((updated) => {
      this.selectedDetail.set({ ...detail, ticket: updated });
      this.loadTickets();
    });
  }

  protected onSubmitReply(event: Event, message: string, replyTextarea: HTMLTextAreaElement): void {
    event.preventDefault();
    const detail = this.selectedDetail();
    if (!detail || !message.trim()) {
      return;
    }
    this.replyError.set(null);
    this.replySubmitting.set(true);
    this.supportTicketService.addReply(detail.ticket.ticketId, message).subscribe({
      next: (reply) => {
        this.replySubmitting.set(false);
        this.selectedDetail.set({ ...detail, replies: [...detail.replies, reply] });
        replyTextarea.value = '';
      },
      error: () => {
        this.replySubmitting.set(false);
        this.replyError.set('Could not post the reply. Please try again.');
      },
    });
  }

  private loadTickets(): void {
    this.loading.set(true);
    this.error.set(false);
    const category = this.categoryFilter() === 'ALL' ? undefined : this.categoryFilter();
    const status = this.statusFilter() === 'ALL' ? undefined : this.statusFilter();
    this.supportTicketService.getAllTickets(category, status).subscribe({
      next: (tickets) => {
        this.tickets.set(tickets);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
```

- [ ] **Step 4: Create the template**

```html
<app-page-header title="Support Tickets" subtitle="Review and respond to tickets raised by travelers." />

<div class="flex flex-wrap gap-3 mt-4">
  <hlm-select [value]="categoryFilter()" (valueChange)="onCategoryFilterChange($event)">
    <hlm-select-trigger class="w-48"><hlm-select-value /></hlm-select-trigger>
    <ng-template hlmSelectPortal>
      <hlm-select-content>
        @for (option of categoryFilters; track option.value) {
          <hlm-select-item [value]="option.value">{{ option.label }}</hlm-select-item>
        }
      </hlm-select-content>
    </ng-template>
  </hlm-select>
  <hlm-select [value]="statusFilter()" (valueChange)="onStatusFilterChange($event)">
    <hlm-select-trigger class="w-48"><hlm-select-value /></hlm-select-trigger>
    <ng-template hlmSelectPortal>
      <hlm-select-content>
        @for (option of statusFilters; track option.value) {
          <hlm-select-item [value]="option.value">{{ option.label }}</hlm-select-item>
        }
      </hlm-select-content>
    </ng-template>
  </hlm-select>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
  <div>
    @if (loading()) {
      <p class="text-sm text-muted-foreground py-6">Loading tickets…</p>
    } @else if (error()) {
      <p class="text-sm text-destructive py-6">Could not load tickets.</p>
    } @else if (tickets().length === 0) {
      <p class="text-sm text-muted-foreground py-6">No tickets match these filters.</p>
    } @else {
      <div class="space-y-2">
        @for (ticket of tickets(); track ticket.ticketId) {
          <button
            type="button"
            hlmCard
            class="w-full text-left p-4 hover:bg-accent/5 transition-colors"
            (click)="selectTicket(ticket.ticketId)"
          >
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="font-medium">{{ ticket.subject }}</p>
                <p class="text-xs text-muted-foreground mt-1">
                  {{ ticket.userName }} · {{ ticket.category }} · {{ ticket.createdAt | date: 'mediumDate' }}
                </p>
              </div>
              <app-status-badge [status]="ticket.status" />
            </div>
          </button>
        }
      </div>
    }
  </div>

  <div>
    @if (detailLoading()) {
      <p class="text-sm text-muted-foreground py-6">Loading ticket…</p>
    } @else if (selectedDetail(); as d) {
      <div hlmCard class="p-4">
        <div class="flex items-center justify-between gap-4">
          <h3 class="font-semibold">{{ d.ticket.subject }}</h3>
          <hlm-select [value]="d.ticket.status" (valueChange)="onStatusChange($event)">
            <hlm-select-trigger class="w-40"><hlm-select-value /></hlm-select-trigger>
            <ng-template hlmSelectPortal>
              <hlm-select-content>
                @for (status of statusOptions; track status) {
                  <hlm-select-item [value]="status">{{ status }}</hlm-select-item>
                }
              </hlm-select-content>
            </ng-template>
          </hlm-select>
        </div>
        <p class="text-xs text-muted-foreground mt-1">
          {{ d.ticket.userName }} · {{ d.ticket.category }} · {{ d.ticket.createdAt | date: 'medium' }}
        </p>
        <p class="text-sm mt-3 whitespace-pre-line">{{ d.ticket.description }}</p>

        <h4 class="text-sm font-semibold mt-4 mb-2">Replies</h4>
        @if (d.replies.length === 0) {
          <p class="text-sm text-muted-foreground">No replies yet.</p>
        } @else {
          <div class="space-y-2">
            @for (reply of d.replies; track reply.replyId) {
              <div class="rounded-md bg-muted p-3">
                <p class="text-sm">{{ reply.message }}</p>
                <p class="text-xs text-muted-foreground mt-1">{{ reply.createdAt | date: 'medium' }}</p>
              </div>
            }
          </div>
        }

        <form class="mt-4 space-y-2" (submit)="onSubmitReply($event, replyInput.value, replyInput)">
          <textarea hlmTextarea class="w-full min-h-20" placeholder="Write a reply…" #replyInput></textarea>
          @if (replyError()) {
            <p class="text-xs text-destructive">{{ replyError() }}</p>
          }
          <button hlmBtn size="sm" type="submit" [disabled]="replySubmitting()">Reply</button>
        </form>
      </div>
    } @else {
      <p class="text-sm text-muted-foreground py-6">Select a ticket to view details.</p>
    }
  </div>
</div>
```

- [ ] **Step 5: Run the spec to verify it passes**

Run: `cd frontend && npx ng test --watch=false --include='**/admin-support-tickets.spec.ts'`
Expected: 4 tests pass, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/admin/components/admin-support-tickets/
git commit -m "feat(support): add the admin support tickets triage view"
```

---

## Task 12: Frontend — routing, navigation, icons, and dashboard link wiring

**Files:**
- Create: `frontend/src/app/features/support/support.routes.ts`
- Create: `frontend/src/app/features/support/support.routes.spec.ts`
- Modify: `frontend/src/app/features/traveler/traveler.routes.ts`
- Modify: `frontend/src/app/features/traveler/traveler.routes.spec.ts`
- Modify: `frontend/src/app/features/admin/admin.routes.ts`
- Modify: `frontend/src/app/features/admin/admin.routes.spec.ts`
- Modify: `frontend/src/app/shared/layout/app-shell/app-shell.ts`
- Modify: `frontend/src/app/shared/layout/app-shell/app-shell.spec.ts`
- Modify: `frontend/src/app/app.config.ts`
- Modify: `frontend/src/app/features/dashboard/dashboard-page/dashboard-page.html`

**Interfaces:**
- Consumes: `RaiseTicketForm` (Task 8), `MyTickets` (Task 9), `TicketDetail` (Task 10), `AdminSupportTickets` (Task 11).
- Produces: the fully wired-in feature — `/support/contact`, `/support/tickets`, `/support/tickets/:id` reachable from the traveler shell nav and dashboard, `/admin/support-tickets` reachable from the admin shell nav. Nothing downstream consumes this task; it is the final integration point.

- [ ] **Step 1: Create `support.routes.ts`**

```typescript
import { Routes } from '@angular/router';

export const SUPPORT_ROUTES: Routes = [
  {
    path: 'contact',
    loadComponent: () =>
      import('@app/features/support/components/raise-ticket-form/raise-ticket-form').then(
        (m) => m.RaiseTicketForm,
      ),
  },
  {
    path: 'tickets',
    loadComponent: () =>
      import('@app/features/support/components/my-tickets/my-tickets').then((m) => m.MyTickets),
  },
  {
    path: 'tickets/:id',
    loadComponent: () =>
      import('@app/features/support/components/ticket-detail/ticket-detail').then(
        (m) => m.TicketDetail,
      ),
  },
];
```

- [ ] **Step 2: Write `support.routes.spec.ts`**

```typescript
import { RaiseTicketForm } from '@app/features/support/components/raise-ticket-form/raise-ticket-form';
import { MyTickets } from '@app/features/support/components/my-tickets/my-tickets';
import { TicketDetail } from '@app/features/support/components/ticket-detail/ticket-detail';
import { SUPPORT_ROUTES } from './support.routes';

describe('SUPPORT_ROUTES', () => {
  it('defines the contact, tickets, and ticket-detail routes', () => {
    expect(SUPPORT_ROUTES.map((r) => r.path)).toEqual(['contact', 'tickets', 'tickets/:id']);
  });

  it('lazily loads the real component for every route', async () => {
    expect(await SUPPORT_ROUTES[0].loadComponent!()).toBe(RaiseTicketForm);
    expect(await SUPPORT_ROUTES[1].loadComponent!()).toBe(MyTickets);
    expect(await SUPPORT_ROUTES[2].loadComponent!()).toBe(TicketDetail);
  });
});
```

- [ ] **Step 3: Wire `support` into `traveler.routes.ts`**

In `frontend/src/app/features/traveler/traveler.routes.ts`, add a new child entry after the `invitations` entry:

```typescript
      {
        path: 'invitations',
        loadChildren: () =>
          import('@app/features/invitations/invitations.routes').then(
            (m) => m.INVITATIONS_ROUTES,
          ),
      },
      {
        path: 'support',
        loadChildren: () =>
          import('@app/features/support/support.routes').then((m) => m.SUPPORT_ROUTES),
      },
```

- [ ] **Step 4: Update `traveler.routes.spec.ts` for the new child**

In `frontend/src/app/features/traveler/traveler.routes.spec.ts`, update the second `it` block's expected path array:

```typescript
    expect(children.map((r) => r.path)).toEqual([
      'dashboard',
      'trips',
      'expenses',
      'profile',
      'notifications',
      'invitations',
      'support',
    ]);
```

And add a new `it` block at the end of the `describe`, verifying the lazy load:

```typescript
  it('lazily loads the support route group', async () => {
    const children = TRAVELER_ROUTES[0].children ?? [];
    const supportChild = children.find((r) => r.path === 'support')!;
    const { SUPPORT_ROUTES } = await import('@app/features/support/support.routes');
    expect(await supportChild.loadChildren!()).toBe(SUPPORT_ROUTES);
  });
```

- [ ] **Step 5: Wire `admin-support-tickets` into `admin.routes.ts`**

In `frontend/src/app/features/admin/admin.routes.ts`, add a new child entry after the `hotels` entry (before `reports`):

```typescript
      {
        path: 'hotels',
        loadComponent: () =>
          import('@app/features/admin/components/admin-hotels/admin-hotels').then(
            (m) => m.AdminHotels,
          ),
      },
      {
        path: 'support-tickets',
        loadComponent: () =>
          import('@app/features/admin/components/admin-support-tickets/admin-support-tickets').then(
            (m) => m.AdminSupportTickets,
          ),
      },
      {
        path: 'reports',
```

- [ ] **Step 6: Update `admin.routes.spec.ts` for the new child**

In `frontend/src/app/features/admin/admin.routes.spec.ts`, add the import:

```typescript
import { AdminSupportTickets } from '@app/features/admin/components/admin-support-tickets/admin-support-tickets';
```

Update the path-array assertion:

```typescript
    expect(children.map((r) => r.path)).toEqual([
      '',
      'route-analytics',
      'partners',
      'funnel',
      'approvals',
      'users',
      'trips',
      'buses',
      'hotels',
      'support-tickets',
      'reports',
    ]);
```

Update the loaded-component-array assertion:

```typescript
    const expected = [
      AdminDashboard,
      AdminRouteAnalytics,
      AdminPartners,
      AdminFunnel,
      AdminApprovals,
      AdminUsers,
      AdminTrips,
      AdminBuses,
      AdminHotels,
      AdminSupportTickets,
      AdminReports,
    ];
```

- [ ] **Step 7: Register the `lucideLifeBuoy` icon globally**

In `frontend/src/app/app.config.ts`, add `lucideLifeBuoy` to the import list from `@ng-icons/lucide` (alphabetically, after `lucideLayoutDashboard`) and to the `provideIcons({...})` call:

```typescript
  lucideLayoutDashboard,
  lucideLifeBuoy,
  lucideLogOut,
```
```typescript
      lucideLayoutDashboard,
      lucideLifeBuoy,
      lucideLogOut,
```

- [ ] **Step 8: Add nav entries in `app-shell.ts`**

In `frontend/src/app/shared/layout/app-shell/app-shell.ts`, add to the `traveler` array in `NAV_MAP` (after `notifications`, before `profile`):

```typescript
    { to: '/notifications', label: 'Notifications', icon: 'lucideBell' },
    { to: '/support/tickets', label: 'Contact Support', icon: 'lucideLifeBuoy' },
    { to: '/profile', label: 'Profile', icon: 'lucideUser' },
```

And to the `admin` array (after `hotels`, before `reports`):

```typescript
    { to: '/admin/hotels', label: 'Hotel Management', icon: 'lucideHotel' },
    { to: '/admin/support-tickets', label: 'Support Tickets', icon: 'lucideLifeBuoy' },
    { to: '/admin/reports', label: 'Reports', icon: 'lucideBarChart3' },
```

- [ ] **Step 9: Register `lucideLifeBuoy` in `app-shell.spec.ts`**

In `frontend/src/app/shared/layout/app-shell/app-shell.spec.ts`, add `lucideLifeBuoy` to the import from `@ng-icons/lucide` and to the `ALL_ICONS` object:

```typescript
  lucideLayoutDashboard,
  lucideLifeBuoy,
  lucideLogOut,
```
```typescript
  lucideLayoutDashboard,
  lucideLifeBuoy,
  lucideLogOut,
```

- [ ] **Step 10: Add a "Contact Support" quick link to the dashboard**

In `frontend/src/app/features/dashboard/dashboard-page/dashboard-page.html`, add a new link inside the existing hero action-button row (the `<div class="mt-6 flex flex-wrap gap-2">` block), after "View Trips":

```html
  <a hlmBtn variant="ghost" class="text-primary-foreground hover:bg-white/15" routerLink="/support/contact">
    Contact Support
  </a>
```

- [ ] **Step 11: Run the full frontend test suite**

Run: `cd frontend && npx ng test --watch=false`
Expected: All tests pass, including the updated `traveler.routes.spec.ts`, `admin.routes.spec.ts`, `app-shell.spec.ts`, and the new `support.routes.spec.ts`.

- [ ] **Step 12: Manually verify in the browser**

Run: `cd frontend && npx ng serve` (with the backend also running), then in a browser:
- Log in as a traveler (the `qa-support-test@travelease.test` / `Password123` account created in Task 5's Step 3, or sign up a new one via the app's Sign up page). Click "Contact Support" in the sidebar nav (or the dashboard hero link), submit a ticket, confirm it redirects to "My Tickets" and the new ticket appears with status `OPEN`.
- Click into the ticket, confirm the description renders and "No replies yet." shows.
- Log in as the seeded admin (`admin@travelease.com` — password is whatever this project's own admin credentials are; ask the user if you don't already have them). Open "Support Tickets" in the admin sidebar, confirm the ticket appears, filter by category/status, click it, post a reply, change its status to `RESOLVED`, confirm the list and detail panel update.
- Log back in as the traveler, reopen the ticket, confirm the reply and updated status (`RESOLVED`) now show.

- [ ] **Step 13: Commit**

```bash
git add frontend/src/app/features/support/support.routes.ts frontend/src/app/features/support/support.routes.spec.ts \
        frontend/src/app/features/traveler/traveler.routes.ts frontend/src/app/features/traveler/traveler.routes.spec.ts \
        frontend/src/app/features/admin/admin.routes.ts frontend/src/app/features/admin/admin.routes.spec.ts \
        frontend/src/app/shared/layout/app-shell/app-shell.ts frontend/src/app/shared/layout/app-shell/app-shell.spec.ts \
        frontend/src/app/app.config.ts \
        frontend/src/app/features/dashboard/dashboard-page/dashboard-page.html
git commit -m "feat(support): wire Contact Support and Support Tickets into routing and nav"
```

---

## Self-Review Notes

- **Spec coverage:** every requirement in `frontend/docs/superpowers/specs/2026-07-09-contact-support-ticket-design.md` maps to a task — data model (Tasks 1–3), API endpoints (Tasks 4–6), user raise/track flow (Tasks 7–10, 12), admin triage flow (Task 11, 12), testing approach (every backend task has a service test; every frontend task has a component/service spec).
- **Deliberate spec refinement:** the spec said `SupportTicket.updatedAt` is "bumped on status change or reply" — Task 4 implements only the status-change half (a real JPA-audited field mutation) and intentionally does not attempt to force-bump `updatedAt` from `addReply`, since replies are a separate entity and forcing a parent-entity touch for that purpose is fragile/non-idiomatic Hibernate. The reply thread's own `createdAt` timestamps already surface recency; this is called out in Global Constraints.
- **Placeholder scan:** no TBD/TODO markers; every step has complete, real code.
- **Type/name consistency check:** `TicketCategory`/`TicketStatus` enum values, `SupportTicketService` method signatures, and DTO field names are identical wherever referenced across backend tasks; `SupportTicket`/`SupportTicketDetail`/`TicketReply`/`CreateTicketPayload` TS interfaces and `SupportTicketService` method names are identical wherever referenced across frontend tasks.
- **Existing-test breakage avoided:** Task 12 explicitly updates the three existing spec files (`traveler.routes.spec.ts`, `admin.routes.spec.ts`, `app-shell.spec.ts`) whose hardcoded arrays would otherwise fail once the new route/nav entries are added — found by inspecting those files directly rather than assuming.
