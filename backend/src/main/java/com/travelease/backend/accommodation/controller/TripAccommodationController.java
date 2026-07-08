package com.travelease.backend.accommodation.controller;

import com.travelease.backend.accommodation.dto.AccommodationSummaryResponse;
import com.travelease.backend.accommodation.dto.AttachHotelBookingRequest;
import com.travelease.backend.accommodation.dto.HotelBookingResponse;
import com.travelease.backend.accommodation.service.AccommodationService;
import com.travelease.backend.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/trips/{tripId}")
@RequiredArgsConstructor
@Tag(name = "Trip Accommodation", description = "Attach/detach/summarize Hotel Bookings associated with a "
        + "Traveler Trip. HotelBooking's own lifecycle (create/update/cancel) is not reachable here - see "
        + "Hotel Booking. Hotel Provider never gains Trip access through this or any other endpoint merely "
        + "because its booking is attached.")
public class TripAccommodationController {

    private final AccommodationService accommodationService;

    @PostMapping("/hotel-bookings")
    @PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")
    @Operation(summary = "Attach an owned Hotel Booking to a Trip", description = "ACCESS: ROLE_TRAVELER or "
            + "ROLE_ADMIN.\n\n"
            + "SCOPE: Trip Organizer or ACCEPTED Trip member (ROLE_ADMIN bypasses this relationship check) "
            + "AND the caller must be the HotelBooking's own owner (bookedBy) - no ADMIN bypass on this "
            + "ownership check.\n\n"
            + "LIFECYCLE: Rejected when the Trip is COMPLETED or CANCELLED.\n\n"
            + "CURRENT IMPLEMENTATION NOTE: unlike Bus/Activity Booking attachment, this endpoint does not "
            + "currently reject a CANCELLED HotelBooking from being attached, does not special-case attaching "
            + "the same booking twice to the same Trip, and does not reject re-attaching a booking already "
            + "attached to a different Trip (it would be silently moved). This is documented as observed "
            + "current behavior, not a guaranteed guarantee.")
    public ResponseEntity<ApiResponse<HotelBookingResponse>> attachBooking(
            @PathVariable UUID tripId,
            @Valid @RequestBody AttachHotelBookingRequest request,
            Authentication authentication
    ) {
        HotelBookingResponse response = accommodationService.attachBookingToTrip(tripId, request, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Hotel booking attached to trip"));
    }

    @DeleteMapping("/hotel-bookings/{bookingId}")
    @PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")
    @Operation(summary = "Detach a Hotel Booking from a Trip", description = "ACCESS: ROLE_TRAVELER or "
            + "ROLE_ADMIN.\n\n"
            + "SCOPE: Trip Organizer OR the booking's own owner may detach it (either is sufficient) - this "
            + "differs from Bus/Activity Booking's owner-only detach rule; a fellow ACCEPTED member who is "
            + "neither Organizer nor the booking owner is still denied.\n\n"
            + "LIFECYCLE: Rejected when the Trip is COMPLETED or CANCELLED.\n\n"
            + "SIDE EFFECTS: Only removes the Trip association; does not cancel the booking or change its "
            + "status.")
    public ResponseEntity<ApiResponse<Void>> removeBooking(
            @PathVariable UUID tripId,
            @PathVariable UUID bookingId,
            Authentication authentication
    ) {
        accommodationService.removeBookingFromTrip(tripId, bookingId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(null, "Hotel booking removed from trip"));
    }

    @GetMapping("/accommodation-summary")
    @PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")
    @Operation(summary = "Get Trip accommodation summary", description = "ACCESS: ROLE_TRAVELER or ROLE_ADMIN.\n\n"
            + "SCOPE: Trip Organizer or ACCEPTED member only (ROLE_ADMIN bypasses); INVITED/REJECTED members "
            + "and unrelated Travelers get 403. This shared visibility does NOT grant ownership of another "
            + "Traveler's booking - the direct Hotel Booking endpoints remain owner-only regardless of what "
            + "this summary shows.\n\n"
            + "LIFECYCLE: This read is allowed even when the Trip is COMPLETED or CANCELLED.")
    public ResponseEntity<ApiResponse<AccommodationSummaryResponse>> summary(
            @PathVariable UUID tripId,
            Authentication authentication
    ) {
        AccommodationSummaryResponse response = accommodationService.getAccommodationSummary(tripId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Accommodation summary retrieved"));
    }
}
