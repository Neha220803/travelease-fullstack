package com.travelease.backend.budget.controller;

import com.travelease.backend.budget.dto.BudgetResponse;
import com.travelease.backend.budget.dto.BudgetSummaryResponse;
import com.travelease.backend.budget.service.BudgetService;
import com.travelease.backend.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/trips/{tripId}/budget")
@RequiredArgsConstructor
@Tag(name = "Trip Budget", description = "Trip budget endpoints for the authenticated ACCEPTED trip member. "
        + "Membership is checked via a self-rolled query (existsByTripIdAndUserEmailAndMemberStatus == "
        + "ACCEPTED) rather than reusing TripAuthorizationService, so - unlike Itinerary and the Trip-booking-"
        + "attachment endpoints - there is no ROLE_ADMIN bypass here: an ADMIN who is not itself an ACCEPTED "
        + "member of the trip also receives 403.")
public class BudgetController {

    private final BudgetService budgetService;

    @GetMapping("/me")
    @Operation(summary = "Get my budget share", description = "ACCESS: AUTHENTICATED.\n\n"
            + "SCOPE: ACCEPTED trip member only (Organizer included, since the Organizer is recorded as an "
            + "ACCEPTED member at Trip creation). INVITED/REJECTED members and unrelated Travelers get 403. "
            + "No ADMIN bypass - an ADMIN who is not itself an ACCEPTED member also gets 403.\n\n"
            + "IDENTITY: The current user is resolved from the JWT/email in the security context.")
    public ResponseEntity<ApiResponse<BudgetResponse>> getMyBudget(
            @PathVariable UUID tripId,
            Authentication authentication
    ) {
        BudgetResponse response = budgetService.getMyBudget(tripId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Budget usage retrieved"));
    }

    @GetMapping("/summary")
    @Operation(summary = "Get trip budget summary", description = "ACCESS: AUTHENTICATED.\n\n"
            + "SCOPE: ACCEPTED trip member only, same rule as above (no ADMIN bypass).\n\n"
            + "IDENTITY: The current user is resolved from the JWT/email in the security context.")
    public ResponseEntity<ApiResponse<BudgetSummaryResponse>> getTripBudgetSummary(
            @PathVariable UUID tripId,
            Authentication authentication
    ) {
        BudgetSummaryResponse response = budgetService.getTripSummary(tripId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Trip budget summary retrieved"));
    }
}
