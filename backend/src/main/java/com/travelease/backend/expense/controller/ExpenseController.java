package com.travelease.backend.expense.controller;

import com.travelease.backend.expense.dto.CreateExpenseRequest;
import com.travelease.backend.expense.dto.ExpenseResponse;
import com.travelease.backend.expense.service.ExpenseService;
import com.travelease.backend.shared.dto.ApiResponse;
import com.travelease.backend.shared.dto.PagedResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/trips/{tripId}/expenses")
@RequiredArgsConstructor
@Tag(name = "Trip Expenses", description = "Shared expense endpoints for accepted trip members")
public class ExpenseController {

    private final ExpenseService expenseService;

    @PostMapping
    @Operation(summary = "Create a shared expense", description = "ACCESS: AUTHENTICATED\nSCOPE: Accepted trip member only. Creates a trip expense and allocates shares to accepted trip participants.\nLIFECYCLE: Mutation is rejected once the Trip is COMPLETED or CANCELLED.\nIDENTITY: The current user is resolved from the JWT/email in the security context.")
    public ResponseEntity<ApiResponse<ExpenseResponse>> createSharedExpense(
            @PathVariable UUID tripId,
            @Valid @RequestBody CreateExpenseRequest request,
            Authentication authentication
    ) {
        ExpenseResponse response = expenseService.createSharedExpense(tripId, request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Shared expense recorded successfully"));
    }

    @GetMapping
    @Operation(summary = "List trip expenses (paginated)", description = "ACCESS: AUTHENTICATED\nSCOPE: Accepted trip member only. Returns paginated expenses recorded on the trip.\nIDENTITY: The current user is resolved from the JWT/email in the security context.")
    public ResponseEntity<ApiResponse<PagedResponse<ExpenseResponse>>> getTripExpenses(
            @PathVariable UUID tripId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication
    ) {
        PagedResponse<ExpenseResponse> response = expenseService.getTripExpensesPaged(
                tripId, authentication.getName(), PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(response, "Trip expenses retrieved"));
    }

    @GetMapping("/{expenseId}")
    @Operation(summary = "Get trip expense by ID", description = "ACCESS: AUTHENTICATED\nSCOPE: Accepted trip member only. Returns a specific expense that belongs to the trip.\nIDENTITY: The current user is resolved from the JWT/email in the security context.")
    public ResponseEntity<ApiResponse<ExpenseResponse>> getTripExpense(
            @PathVariable UUID tripId,
            @PathVariable UUID expenseId,
            Authentication authentication
    ) {
        ExpenseResponse response = expenseService.getTripExpense(tripId, expenseId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Expense retrieved"));
    }

    @PatchMapping("/{expenseId}/approve")
    @Operation(summary = "Approve my share of a split expense", description = "ACCESS: AUTHENTICATED\nSCOPE: A participant of the expense only. Once every participant has approved, the expense is finalized and each participant's TripMember.spentAmount is charged.\nIDENTITY: The current user is resolved from the JWT/email in the security context.")
    public ResponseEntity<ApiResponse<ExpenseResponse>> approveExpense(
            @PathVariable UUID tripId,
            @PathVariable UUID expenseId,
            Authentication authentication
    ) {
        ExpenseResponse response = expenseService.approveExpense(tripId, expenseId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Expense approved"));
    }

    @PatchMapping("/{expenseId}/reject")
    @Operation(summary = "Reject my share of a split expense", description = "ACCESS: AUTHENTICATED\nSCOPE: A participant of the expense only. A single rejection terminally rejects the whole split - no charges are applied to anyone.\nIDENTITY: The current user is resolved from the JWT/email in the security context.")
    public ResponseEntity<ApiResponse<ExpenseResponse>> rejectExpense(
            @PathVariable UUID tripId,
            @PathVariable UUID expenseId,
            Authentication authentication
    ) {
        ExpenseResponse response = expenseService.rejectExpense(tripId, expenseId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Expense rejected"));
    }
}

