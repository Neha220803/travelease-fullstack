package com.travelease.backend.accommodation.controller;

import com.travelease.backend.accommodation.dto.BookingQuoteResponse;
import com.travelease.backend.accommodation.dto.BookingValidationResponse;
import com.travelease.backend.accommodation.dto.HotelBillResponse;
import com.travelease.backend.accommodation.dto.HotelBookingRequest;
import com.travelease.backend.accommodation.dto.HotelBookingResponse;
import com.travelease.backend.accommodation.service.AccommodationService;
import com.travelease.backend.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/hotel-bookings")
@RequiredArgsConstructor
@Tag(name = "Hotel Booking", description = "Traveler-owned Hotel Booking create/view/update/cancel/bill. "
        + "Ownership is the authenticated Traveler who created the booking (HotelBooking.bookedBy) - shared "
        + "Traveler Trip visibility never transfers this ownership. Not in SecurityConfig's permitAll list, so "
        + "every endpoint requires a valid JWT even though none carries a role-specific @PreAuthorize.")
public class HotelBookingController {

    private final AccommodationService accommodationService;

    @PostMapping("/validate")
    @Operation(summary = "Validate a prospective Hotel Booking", description = "ACCESS: AUTHENTICATED (any role).\n\n"
            + "SCOPE: Pre-booking check, no booking exists yet - not ownership-scoped.")
    public ResponseEntity<ApiResponse<BookingValidationResponse>> validate(
            @Valid @RequestBody HotelBookingRequest request
    ) {
        BookingValidationResponse response = accommodationService.validateBooking(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Booking validation completed"));
    }

    @PostMapping("/quote")
    @Operation(summary = "Quote a prospective Hotel Booking", description = "ACCESS: AUTHENTICATED (any role).\n\n"
            + "SCOPE: Pre-booking pricing only, no booking exists yet - not ownership-scoped.")
    public ResponseEntity<ApiResponse<BookingQuoteResponse>> quote(@Valid @RequestBody HotelBookingRequest request) {
        BookingQuoteResponse response = accommodationService.quoteBooking(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Hotel booking quote generated"));
    }

    @PostMapping
    @Operation(summary = "Create a Hotel Booking", description = "ACCESS: AUTHENTICATED (any role).\n\n"
            + "IDENTITY: The booking owner is resolved from the authenticated JWT, not a client-supplied field.")
    public ResponseEntity<ApiResponse<HotelBookingResponse>> create(
            @Valid @RequestBody HotelBookingRequest request,
            Authentication authentication
    ) {
        HotelBookingResponse response = accommodationService.createBooking(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Hotel booking confirmed"));
    }

    @GetMapping("/{bookingId}")
    @Operation(summary = "Get my Hotel Booking", description = "ACCESS: AUTHENTICATED (any role).\n\n"
            + "SCOPE: Original booking owner only - no ADMIN bypass on this ownership check. Another "
            + "Traveler's booking id returns 403.")
    public ResponseEntity<ApiResponse<HotelBookingResponse>> getBooking(
            @PathVariable UUID bookingId,
            Authentication authentication
    ) {
        HotelBookingResponse response = accommodationService.getBooking(bookingId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Hotel booking retrieved"));
    }

    @PutMapping("/{bookingId}")
    @Operation(summary = "Update my Hotel Booking", description = "ACCESS: AUTHENTICATED (any role).\n\n"
            + "SCOPE: Original booking owner only, no ADMIN bypass.")
    public ResponseEntity<ApiResponse<HotelBookingResponse>> update(
            @PathVariable UUID bookingId,
            @Valid @RequestBody HotelBookingRequest request,
            Authentication authentication
    ) {
        HotelBookingResponse response = accommodationService.updateBooking(bookingId, request, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Hotel booking updated"));
    }

    @PutMapping("/{bookingId}/cancel")
    @Operation(summary = "Cancel my Hotel Booking", description = "ACCESS: AUTHENTICATED (any role).\n\n"
            + "SCOPE: Original booking owner only, no ADMIN bypass.")
    public ResponseEntity<ApiResponse<HotelBookingResponse>> cancel(
            @PathVariable UUID bookingId,
            Authentication authentication
    ) {
        HotelBookingResponse response = accommodationService.cancelBooking(bookingId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Hotel booking cancelled"));
    }

    @GetMapping("/{bookingId}/bill")
    @Operation(summary = "Get my Hotel Booking bill", description = "ACCESS: AUTHENTICATED (any role).\n\n"
            + "SCOPE: Original booking owner only, no ADMIN bypass.")
    public ResponseEntity<ApiResponse<HotelBillResponse>> bill(
            @PathVariable UUID bookingId,
            Authentication authentication
    ) {
        HotelBillResponse response = accommodationService.getBill(bookingId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Hotel booking bill retrieved"));
    }
}
