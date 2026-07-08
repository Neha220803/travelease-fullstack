package com.travelease.backend.settlement.controller;

import com.travelease.backend.settlement.dto.SettlementResponse;
import com.travelease.backend.settlement.dto.SettlementSummaryResponse;
import com.travelease.backend.settlement.service.SettlementService;
import com.travelease.backend.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "Trip Settlements", description = "Settlement recalculation and payment endpoints. The two "
        + "trip-scoped GETs check ACCEPTED trip membership via a self-rolled query (no ROLE_ADMIN bypass - an "
        + "ADMIN who is not itself an ACCEPTED member also gets 403); markPaid uses a narrower, different "
        + "rule entirely (settlement participant identity, not Trip membership) since only the two people "
        + "the settlement is actually between should be able to mark it paid.")
public class SettlementController {

    private final SettlementService settlementService;

    @GetMapping("/api/trips/{tripId}/settlements/me")
    @Operation(summary = "Get my trip settlements", description = "ACCESS: AUTHENTICATED.\n\n"
            + "SCOPE: ACCEPTED trip member only (no ADMIN bypass). Returns settlement rows where the current "
            + "user participates as payer or receiver.\n\n"
            + "LIFECYCLE: Not gated by Trip status - this recalculates/reads settlements regardless of whether "
            + "the Trip is PLANNING/CONFIRMED/ONGOING/COMPLETED/CANCELLED, since post-trip financial closure is "
            + "an intentional exception to the terminal-Trip lock (see TripAuthorizationService.requireMutableTrip "
            + "javadoc).\n\n"
            + "IDENTITY: The current user is resolved from the JWT/email in the security context.")
    public ResponseEntity<ApiResponse<List<SettlementResponse>>> getMySettlements(
            @PathVariable UUID tripId,
            Authentication authentication
    ) {
        List<SettlementResponse> response = settlementService.getMySettlements(tripId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Settlement details retrieved"));
    }

    @GetMapping("/api/trips/{tripId}/settlements/summary")
    @Operation(summary = "Get trip settlement summary", description = "ACCESS: AUTHENTICATED.\n\n"
            + "SCOPE: ACCEPTED trip member only (no ADMIN bypass). Recalculates and returns the trip "
            + "settlement summary.\n\n"
            + "LIFECYCLE: Same post-trip-exception behavior as getMySettlements above - not gated by Trip status.\n\n"
            + "IDENTITY: The current user is resolved from the JWT/email in the security context.")
    public ResponseEntity<ApiResponse<SettlementSummaryResponse>> getTripSettlementSummary(
            @PathVariable UUID tripId,
            Authentication authentication
    ) {
        SettlementSummaryResponse response = settlementService.getTripSummary(tripId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Settlement summary retrieved"));
    }

    @PatchMapping("/api/settlements/{settlementId}/paid")
    @Operation(summary = "Mark settlement as paid", description = "ACCESS: AUTHENTICATED.\n\n"
            + "SCOPE: Settlement participant only - the current user must be the payer or receiver of this "
            + "specific settlement (not just any ACCEPTED trip member, and no ADMIN bypass).\n\n"
            + "LIFECYCLE: Not gated by Trip status - paying off an already-incurred debt is expected to happen "
            + "after a trip ends.\n\n"
            + "IDENTITY: The current user is resolved from the JWT/email in the security context.")
    public ResponseEntity<ApiResponse<SettlementResponse>> markPaid(
            @PathVariable UUID settlementId,
            Authentication authentication
    ) {
        SettlementResponse response = settlementService.markPaid(settlementId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Settlement marked as paid"));
    }
}
