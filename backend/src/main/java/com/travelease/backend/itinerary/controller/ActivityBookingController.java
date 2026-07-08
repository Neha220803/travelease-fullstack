package com.travelease.backend.itinerary.controller;

import com.travelease.backend.itinerary.dto.ActivityBookingResponse;
import com.travelease.backend.itinerary.dto.CreateActivityBookingRequest;
import com.travelease.backend.itinerary.service.ActivityBookingService;
import com.travelease.backend.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Traveler-facing Activity Booking endpoints - creating, viewing, and
 * cancelling one's own bookings. Provider-side visibility/attendance
 * endpoints live on ActivityProviderController; slot discovery (browsing
 * bookable slots for an Activity) lives on ActivityController, since that
 * class already owns the public/unauthenticated Activity catalog surface.
 */
@RestController
@RequestMapping("/api/activity-bookings")
@RequiredArgsConstructor
@Tag(name = "Activity Booking", description = "Traveler-owned Activity Booking create/view/cancel. Ownership is "
        + "always the authenticated Traveler who created the booking (ActivityBooking.bookedBy) - shared "
        + "Traveler Trip visibility never transfers this ownership. Provider-side visibility/attendance live "
        + "on Activity Provider Management; slot discovery lives on Activity Catalog.")
public class ActivityBookingController {

    private final ActivityBookingService activityBookingService;

    @PostMapping
    @PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")
    @Operation(summary = "Create an Activity Booking", description = "ACCESS: ROLE_TRAVELER or ROLE_ADMIN.\n\n"
            + "SCOPE: The booking is always created as owned by the authenticated caller - the request body "
            + "carries only activitySlotId/participantCount, no bookedBy/userId field is accepted.\n\n"
            + "LIFECYCLE: Rejected if the target slot's start date/time has already passed, or if the "
            + "requested participantCount would exceed the slot's remaining capacity (409).\n\n"
            + "IDENTITY: Booking owner is resolved from the authenticated JWT.\n\n"
            + "TEST NOTE: Get a future activitySlotId from GET /api/activities/{activityId}/slots first.")
    public ResponseEntity<ApiResponse<ActivityBookingResponse>> createBooking(
            @Valid @RequestBody CreateActivityBookingRequest request
    ) {
        ActivityBookingResponse response = activityBookingService.createBooking(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Activity booking created"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")
    @Operation(summary = "List my Activity Bookings", description = "ACCESS: ROLE_TRAVELER or ROLE_ADMIN.\n\n"
            + "SCOPE: Always scoped to the authenticated caller's own bookings (ActivityBooking.bookedBy). "
            + "There is no cross-traveler listing here, including for ROLE_ADMIN - an ADMIN calling this "
            + "endpoint sees only bookings made under the ADMIN's own account, not every Traveler's bookings.")
    public ResponseEntity<ApiResponse<List<ActivityBookingResponse>>> getMyBookings() {
        List<ActivityBookingResponse> response = activityBookingService.getMyBookings();
        return ResponseEntity.ok(ApiResponse.success(response, "Your activity bookings retrieved"));
    }

    @GetMapping("/{bookingId}")
    @PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")
    @Operation(summary = "Get one of my Activity Bookings", description = "ACCESS: ROLE_TRAVELER or ROLE_ADMIN.\n\n"
            + "SCOPE: Original booking owner only. There is no ADMIN bypass on this ownership check - an ADMIN "
            + "calling this on a booking it does not own also receives 403. Another Traveler's booking, "
            + "including one an ACCEPTED Trip member can see via the shared Trip view, still returns 403 here.\n\n"
            + "TEST NOTE: Use a bookingId returned from POST /api/activity-bookings made by the same account.")
    public ResponseEntity<ApiResponse<ActivityBookingResponse>> getMyBooking(@PathVariable UUID bookingId) {
        ActivityBookingResponse response = activityBookingService.getMyBooking(bookingId);
        return ResponseEntity.ok(ApiResponse.success(response, "Activity booking retrieved"));
    }

    @PutMapping("/{bookingId}/cancel")
    @PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")
    @Operation(summary = "Cancel my Activity Booking", description = "ACCESS: ROLE_TRAVELER or ROLE_ADMIN.\n\n"
            + "SCOPE: Original booking owner only, no ADMIN bypass on ownership (same as GET above). Only a "
            + "CONFIRMED booking can be cancelled, and only before the slot's start date/time.\n\n"
            + "LIFECYCLE NOTE: Cancelling does not remove any existing Traveler Trip attachment - the booking "
            + "stays attached with status CANCELLED for historical Trip visibility, and the slot's capacity "
            + "becomes reusable by other Travelers.")
    public ResponseEntity<ApiResponse<ActivityBookingResponse>> cancelBooking(@PathVariable UUID bookingId) {
        ActivityBookingResponse response = activityBookingService.cancelBooking(bookingId);
        return ResponseEntity.ok(ApiResponse.success(response, "Activity booking cancelled"));
    }
}
