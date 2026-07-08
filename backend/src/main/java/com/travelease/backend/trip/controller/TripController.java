package com.travelease.backend.trip.controller;

import com.travelease.backend.shared.dto.ApiResponse;
import com.travelease.backend.trip.dto.AddTripMemberRequest;
import com.travelease.backend.trip.dto.CreateTripRequest;
import com.travelease.backend.trip.dto.PendingInvitationResponse;
import com.travelease.backend.trip.dto.TripMemberResponse;
import com.travelease.backend.trip.dto.TripResponse;
import com.travelease.backend.trip.dto.TripStatusTransitionRequest;
import com.travelease.backend.trip.dto.UpdateTripRequest;
import com.travelease.backend.trip.service.TripService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
@Tag(name = "Traveler Trip Management", description = "Collaborative Traveler Trip planning. Trip Organizer is "
        + "a relationship derived from Trip.organizer (the Traveler who created the trip), not a JWT role. "
        + "ACCEPTED Trip Member (TripMember.memberStatus == ACCEPTED) is likewise a relationship, not a JWT role. "
        + "INVITED and REJECTED members are not active members.")
public class TripController {

    private final TripService tripService;

    @PostMapping
    @PreAuthorize("hasRole('TRAVELER')")
    @Operation(summary = "Create a Traveler Trip", description = "ACCESS: ROLE_TRAVELER.\n\n"
            + "SCOPE: The authenticated Traveler becomes this Trip's Organizer (Trip.organizer) and is also "
            + "recorded as an ACCEPTED TripMember.\n\n"
            + "IDENTITY: Organizer identity is resolved from the authenticated JWT; no client-supplied "
            + "organizerId is accepted.\n\n"
            + "TEST NOTE: Login as traveler@travelease.com (or any ROLE_TRAVELER account) before calling this.")
    public ResponseEntity<ApiResponse<TripResponse>> createTrip(
            @Valid @RequestBody CreateTripRequest request,
            Authentication authentication
    ) {
        TripResponse response = tripService.createTrip(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Trip created successfully"));
    }

    @GetMapping
    @PreAuthorize("hasRole('TRAVELER')")
    @Operation(summary = "List my Trips", description = "ACCESS: ROLE_TRAVELER.\n\n"
            + "SCOPE: Returns only Trips where the authenticated Traveler is Organizer or an ACCEPTED TripMember. "
            + "Trips where the caller is merely INVITED or REJECTED are not included here (see /invitations).")
    public ResponseEntity<ApiResponse<List<TripResponse>>> getMyTrips(Authentication authentication) {
        List<TripResponse> response = tripService.getMyTrips(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Trips retrieved"));
    }

    @GetMapping("/invitations")
    @PreAuthorize("hasRole('TRAVELER')")
    @Operation(summary = "List my pending Trip invitations", description = "ACCESS: ROLE_TRAVELER.\n\n"
            + "SCOPE: Returns this Traveler's own TripMember rows with memberStatus == INVITED only.")
    public ResponseEntity<ApiResponse<List<PendingInvitationResponse>>> getMyPendingInvitations(Authentication authentication) {
        List<PendingInvitationResponse> response = tripService.getMyPendingInvitations(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Pending trip invitations retrieved"));
    }

    @GetMapping("/{tripId}")
    @PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")
    @Operation(summary = "Get a Trip by id", description = "ACCESS: ROLE_TRAVELER or ROLE_ADMIN.\n\n"
            + "SCOPE: Organizer or ACCEPTED member only. ROLE_ADMIN bypasses the relationship check. "
            + "INVITED/REJECTED members and unrelated Travelers receive 403.\n\n"
            + "TEST NOTE: Use a tripId returned from POST /api/trips created by the logged-in account, "
            + "or a Trip the account has ACCEPTED membership on.")
    public ResponseEntity<ApiResponse<TripResponse>> getTripById(
            @PathVariable UUID tripId,
            Authentication authentication
    ) {
        TripResponse response = tripService.getTripById(tripId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Trip retrieved"));
    }

    @PutMapping("/{tripId}")
    @PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")
    @Operation(summary = "Update Trip details", description = "ACCESS: ROLE_TRAVELER or ROLE_ADMIN.\n\n"
            + "SCOPE: Trip Organizer only (ACCEPTED members cannot update Trip details). ROLE_ADMIN bypasses "
            + "the Organizer check.\n\n"
            + "LIFECYCLE: Rejected when the Trip is COMPLETED or CANCELLED.")
    public ResponseEntity<ApiResponse<TripResponse>> updateTrip(
            @PathVariable UUID tripId,
            @Valid @RequestBody UpdateTripRequest request,
            Authentication authentication
    ) {
        TripResponse response = tripService.updateTrip(tripId, request, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Trip updated successfully"));
    }

    @PatchMapping("/{tripId}/status")
    @PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")
    @Operation(summary = "Transition Trip lifecycle status", description = "ACCESS: ROLE_TRAVELER or ROLE_ADMIN.\n\n"
            + "SCOPE: Trip Organizer only. ROLE_ADMIN bypasses the Organizer check but still must respect the "
            + "transition graph and date guard below - there is no admin override for either.\n\n"
            + "LIFECYCLE: Allowed transitions are PLANNING->CONFIRMED, PLANNING->CANCELLED, CONFIRMED->ONGOING, "
            + "CONFIRMED->CANCELLED, ONGOING->COMPLETED. COMPLETED and CANCELLED are terminal (no further "
            + "transition, including back to the same status). Transitioning to ONGOING is additionally "
            + "rejected if the Trip's startDate has not yet arrived.")
    public ResponseEntity<ApiResponse<TripResponse>> transitionStatus(
            @PathVariable UUID tripId,
            @Valid @RequestBody TripStatusTransitionRequest request,
            Authentication authentication
    ) {
        TripResponse response = tripService.transitionStatus(tripId, request, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Trip status updated"));
    }

    @GetMapping("/{tripId}/members")
    @PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")
    @Operation(summary = "List Trip members", description = "ACCESS: ROLE_TRAVELER or ROLE_ADMIN.\n\n"
            + "SCOPE: Organizer or ACCEPTED member only. ROLE_ADMIN bypasses the relationship check. Returns "
            + "members of every status (INVITED/ACCEPTED/REJECTED), not only active ones.")
    public ResponseEntity<ApiResponse<List<TripMemberResponse>>> getTripMembers(
            @PathVariable UUID tripId,
            Authentication authentication
    ) {
        List<TripMemberResponse> response = tripService.getTripMembers(tripId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Trip members retrieved"));
    }

    @PostMapping("/{tripId}/members")
    @PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")
    @Operation(summary = "Invite a Traveler to a Trip", description = "ACCESS: ROLE_TRAVELER or ROLE_ADMIN.\n\n"
            + "SCOPE: Trip Organizer only. ROLE_ADMIN bypasses the Organizer check. The invited email must "
            + "belong to an existing ROLE_TRAVELER account; the Organizer cannot invite themselves.\n\n"
            + "LIFECYCLE: Rejected when the Trip is COMPLETED or CANCELLED.\n\n"
            + "TEST NOTE: Register a second Traveler account first if you want to test the full invite/accept/"
            + "reject flow.")
    public ResponseEntity<ApiResponse<TripMemberResponse>> addTripMember(
            @PathVariable UUID tripId,
            @Valid @RequestBody AddTripMemberRequest request,
            Authentication authentication
    ) {
        TripMemberResponse response = tripService.addTripMember(tripId, request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Trip invitation sent"));
    }

    @PatchMapping("/{tripId}/members/{tripMemberId}/accept")
    @PreAuthorize("hasRole('TRAVELER')")
    @Operation(summary = "Accept a Trip invitation", description = "ACCESS: ROLE_TRAVELER.\n\n"
            + "SCOPE: Only the invited Traveler themselves may accept their own invitation - there is no "
            + "Organizer or ADMIN override for this action, and no client-supplied identity is trusted "
            + "(the invited user is resolved from the authenticated JWT and compared to the TripMember row). "
            + "Only a currently INVITED row can be accepted.\n\n"
            + "LIFECYCLE: Rejected when the Trip is COMPLETED or CANCELLED.\n\n"
            + "TEST NOTE: tripMemberId comes from the response of POST /api/trips/{tripId}/members; log in as "
            + "the invited Traveler (not the Organizer) to call this.")
    public ResponseEntity<ApiResponse<TripMemberResponse>> acceptTripMemberInvitation(
            @PathVariable UUID tripId,
            @PathVariable UUID tripMemberId,
            Authentication authentication
    ) {
        TripMemberResponse response = tripService.acceptTripMemberInvitation(tripId, tripMemberId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Trip invitation accepted"));
    }

    @PatchMapping("/{tripId}/members/{tripMemberId}/reject")
    @PreAuthorize("hasRole('TRAVELER')")
    @Operation(summary = "Reject a Trip invitation", description = "ACCESS: ROLE_TRAVELER.\n\n"
            + "SCOPE: Only the invited Traveler themselves may reject their own invitation - no Organizer or "
            + "ADMIN override. Only a currently INVITED row can be rejected.\n\n"
            + "LIFECYCLE: Rejected when the Trip is COMPLETED or CANCELLED.")
    public ResponseEntity<ApiResponse<TripMemberResponse>> rejectTripMemberInvitation(
            @PathVariable UUID tripId,
            @PathVariable UUID tripMemberId,
            Authentication authentication
    ) {
        TripMemberResponse response = tripService.rejectTripMemberInvitation(tripId, tripMemberId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Trip invitation rejected"));
    }

    @DeleteMapping("/{tripId}/members/{tripMemberId}")
    @PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")
    @Operation(summary = "Remove a Trip member", description = "ACCESS: ROLE_TRAVELER or ROLE_ADMIN.\n\n"
            + "SCOPE: Trip Organizer only. ROLE_ADMIN bypasses the Organizer check. Works on a member of any "
            + "status (withdraws an INVITED invitation, removes an ACCEPTED member, or clears a REJECTED row). "
            + "The Organizer's own membership cannot be removed.\n\n"
            + "LIFECYCLE: Rejected when the Trip is COMPLETED or CANCELLED.")
    public ResponseEntity<ApiResponse<Void>> removeTripMember(
            @PathVariable UUID tripId,
            @PathVariable UUID tripMemberId,
            Authentication authentication
    ) {
        tripService.removeTripMember(tripId, tripMemberId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(null, "Trip member removed"));
    }
}
