package com.travelease.backend.busbooking.controller;

import com.travelease.backend.busbooking.dto.request.AttachBusBookingRequest;
import com.travelease.backend.busbooking.dto.response.ApiResponse;
import com.travelease.backend.busbooking.dto.response.TripBusBookingResponse;
import com.travelease.backend.busbooking.dto.response.TripBusBookingSummaryResponse;
import com.travelease.backend.busbooking.service.BookingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Attach/detach/list only - Bus Booking's own lifecycle (create, confirm,
 * cancel, ticket, timeline) remains exclusively BookingController's
 * responsibility. Mirrors the existing accommodation.TripAccommodationController
 * precedent for HotelBooking-to-Trip association, adapted to this module's own
 * SecurityUtil-based current-user resolution convention instead of the
 * Authentication-parameter convention used there.
 */
@RestController
@RequestMapping("/api/trips/{tripId}")
@RequiredArgsConstructor
@Tag(name = "Trip Bus Booking", description = "Attach/detach/list Bus Bookings associated with a Traveler Trip. "
        + "Bus Provider never gains Trip access through this or any other endpoint merely because its booking "
        + "is attached.")
public class TripBusBookingController {

    private final BookingService bookingService;

    @PostMapping("/bus-bookings")
    @PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")
    @Operation(summary = "Attach an owned Bus Booking to a Traveler Trip", description = "ACCESS: ROLE_TRAVELER "
            + "or ROLE_ADMIN.\n\n"
            + "SCOPE: Trip Organizer or ACCEPTED Trip member (ROLE_ADMIN bypasses this relationship check) AND "
            + "the caller must be the Booking's own owner - ROLE_ADMIN also bypasses this ownership check "
            + "(unlike Hotel/Activity Booking attachment, which have no ADMIN ownership bypass). Only "
            + "CONFIRMED or COMPLETED bookings are eligible; CANCELLED/PENDING/FAILED/EXPIRED cannot be newly "
            + "attached. Re-attaching to the same Trip is idempotent (200); attaching a booking already on a "
            + "different Trip is rejected (400) - never silently moved.\n\n"
            + "LIFECYCLE: Rejected when the Trip is COMPLETED or CANCELLED.")
    public ResponseEntity<ApiResponse<TripBusBookingResponse>> attachBooking(
            @PathVariable UUID tripId,
            @Valid @RequestBody AttachBusBookingRequest request
    ) {
        TripBusBookingResponse response = bookingService.attachBookingToTrip(tripId, request);
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(HttpStatus.OK.value(), "Bus booking attached to trip", response, "/api/trips/" + tripId + "/bus-bookings"));
    }

    @DeleteMapping("/bus-bookings/{bookingId}")
    @PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")
    @Operation(summary = "Detach an owned Bus Booking from a Traveler Trip", description = "ACCESS: "
            + "ROLE_TRAVELER or ROLE_ADMIN.\n\n"
            + "SCOPE: Trip Organizer or ACCEPTED member for Trip access, PLUS the booking's own owner - "
            + "deliberately owner-only (not Organizer-or-owner, unlike Hotel Booking detach): the Trip "
            + "Organizer cannot detach a fellow member's booking merely by being Organizer. ROLE_ADMIN "
            + "bypasses the ownership check.\n\n"
            + "LIFECYCLE: Rejected when the Trip is COMPLETED or CANCELLED.\n\n"
            + "SIDE EFFECTS: Only removes the Trip association; does not cancel the booking or alter its status.")
    public ResponseEntity<ApiResponse<Void>> removeBooking(
            @PathVariable UUID tripId,
            @PathVariable Long bookingId
    ) {
        bookingService.removeBookingFromTrip(tripId, bookingId);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Bus booking removed from trip", null, "/api/trips/" + tripId + "/bus-bookings/" + bookingId));
    }

    @GetMapping("/bus-bookings")
    @PreAuthorize("hasAnyRole('TRAVELER','ADMIN')")
    @Operation(summary = "List Bus Bookings associated with a Traveler Trip", description = "ACCESS: "
            + "ROLE_TRAVELER or ROLE_ADMIN.\n\n"
            + "SCOPE: Trip Organizer or ACCEPTED member only (ROLE_ADMIN bypasses); INVITED/REJECTED members "
            + "and unrelated Travelers get 403. Shared visibility here does not grant ownership of another "
            + "Traveler's booking through the direct Booking endpoints.\n\n"
            + "LIFECYCLE: This read is allowed even when the Trip is COMPLETED or CANCELLED.")
    public ResponseEntity<ApiResponse<TripBusBookingSummaryResponse>> tripBusBookings(@PathVariable UUID tripId) {
        TripBusBookingSummaryResponse response = bookingService.getTripBusBookings(tripId);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Trip bus bookings retrieved", response, "/api/trips/" + tripId + "/bus-bookings"));
    }
}

