package com.travelease.backend.itinerary.controller;

import com.travelease.backend.itinerary.dto.ActivityBookingResponse;
import com.travelease.backend.itinerary.dto.AttachActivityBookingRequest;
import com.travelease.backend.itinerary.service.ActivityBookingService;
import com.travelease.backend.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Attach/detach/list only - ActivityBooking's own lifecycle (create, cancel,
 * attendance) remains exclusively ActivityBookingController's/
 * ActivityProviderController's responsibility. Mirrors the existing
 * TripBusBookingController/TripAccommodationController precedent for
 * Bus/Hotel Booking-to-Trip association.
 */
@RestController
@RequestMapping("/api/trips/{tripId}/activity-bookings")
@RequiredArgsConstructor
@Tag(name = "Trip Activity Booking", description = "Attach/detach/list Activity Bookings associated with a "
        + "Traveler Trip. ActivityBooking's own lifecycle (create/cancel/attendance) is not reachable here - "
        + "see Activity Booking and Activity Provider Management. Activity Provider never gains Trip access "
        + "through this or any other endpoint merely because its booking is attached.")
public class TripActivityBookingController {

    private final ActivityBookingService activityBookingService;

    @PostMapping
    @PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")
    @Operation(summary = "Attach an owned Activity Booking to a Trip", description = "ACCESS: ROLE_TRAVELER or "
            + "ROLE_ADMIN.\n\n"
            + "SCOPE: Trip Organizer or ACCEPTED Trip member (ROLE_ADMIN bypasses this relationship check) "
            + "AND the caller must be the ActivityBooking's own owner (bookedBy) - there is no ADMIN bypass on "
            + "this ownership check, so an ADMIN attaching a booking it does not own still gets 403. Only "
            + "CONFIRMED, ATTENDED, or NO_SHOW bookings are eligible; CANCELLED cannot be newly attached. "
            + "Re-attaching to the same Trip is idempotent (200, not an error); attaching a booking already on "
            + "a different Trip is rejected (400) - it is never silently moved.\n\n"
            + "LIFECYCLE: Rejected when the Trip is COMPLETED or CANCELLED.\n\n"
            + "IDENTITY: Both the Trip relationship and the booking owner are resolved from the authenticated "
            + "JWT, never from a client-supplied field.")
    public ResponseEntity<ApiResponse<ActivityBookingResponse>> attachBooking(
            @PathVariable UUID tripId,
            @Valid @RequestBody AttachActivityBookingRequest request
    ) {
        ActivityBookingResponse response = activityBookingService.attachBookingToTrip(tripId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Activity booking attached to trip"));
    }

    @DeleteMapping("/{bookingId}")
    @PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")
    @Operation(summary = "Detach an Activity Booking from a Trip", description = "ACCESS: ROLE_TRAVELER or "
            + "ROLE_ADMIN.\n\n"
            + "SCOPE: Trip Organizer or ACCEPTED member for Trip access, PLUS the booking's own owner - "
            + "deliberately owner-only (not Organizer-or-owner): the Trip Organizer cannot detach a fellow "
            + "ACCEPTED member's booking merely by being Organizer, since Organizer is a Trip-level authority, "
            + "not a booking-level one. No ADMIN bypass on the ownership check.\n\n"
            + "LIFECYCLE: Rejected when the Trip is COMPLETED or CANCELLED.\n\n"
            + "SIDE EFFECTS: Only removes the Trip association. Does not cancel the booking, change its status, "
            + "restore/consume slot capacity, or alter its price snapshot - the ActivityBooking continues to "
            + "exist as a Traveler-owned booking.")
    public ResponseEntity<ApiResponse<Void>> removeBooking(
            @PathVariable UUID tripId,
            @PathVariable UUID bookingId
    ) {
        activityBookingService.removeBookingFromTrip(tripId, bookingId);
        return ResponseEntity.ok(ApiResponse.success(null, "Activity booking removed from trip"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")
    @Operation(summary = "List Activity Bookings attached to a Trip", description = "ACCESS: ROLE_TRAVELER or "
            + "ROLE_ADMIN.\n\n"
            + "SCOPE: Trip Organizer or ACCEPTED member only (ROLE_ADMIN bypasses); INVITED/REJECTED members "
            + "and unrelated Travelers get 403. This shared visibility does NOT grant ownership of another "
            + "Traveler's booking - GET /api/activity-bookings/{bookingId} remains owner-only regardless of "
            + "what this endpoint shows.\n\n"
            + "LIFECYCLE: Unlike attach/detach, this read is allowed even when the Trip is COMPLETED or "
            + "CANCELLED (historical composition remains visible).")
    public ResponseEntity<ApiResponse<List<ActivityBookingResponse>>> tripActivityBookings(@PathVariable UUID tripId) {
        List<ActivityBookingResponse> response = activityBookingService.getTripActivityBookings(tripId);
        return ResponseEntity.ok(ApiResponse.success(response, "Trip activity bookings retrieved"));
    }
}
