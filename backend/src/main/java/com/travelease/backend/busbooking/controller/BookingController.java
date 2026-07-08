package com.travelease.backend.busbooking.controller;

import com.travelease.backend.busbooking.dto.request.BookingModificationRequest;
import com.travelease.backend.busbooking.dto.request.BookingRequest;
import com.travelease.backend.busbooking.dto.request.CancellationRequest;
import com.travelease.backend.busbooking.dto.request.PartialCancellationRequest;
import com.travelease.backend.busbooking.dto.response.ApiResponse;
import com.travelease.backend.busbooking.dto.response.BookingHistoryResponse;
import com.travelease.backend.busbooking.dto.response.BookingResponse;
import com.travelease.backend.busbooking.dto.response.BookingTimelineResponse;
import com.travelease.backend.busbooking.dto.response.CancellationResponse;
import com.travelease.backend.busbooking.dto.response.PaginatedSearchResponse;
import com.travelease.backend.busbooking.dto.response.TicketResponse;
import com.travelease.backend.busbooking.entity.enums.BookingStatus;
import com.travelease.backend.busbooking.service.BookingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
@Tag(name = "Booking Management", description = "Traveler-owned Bus Booking lifecycle: create/view/confirm/"
        + "modify/cancel/ticket. No @PreAuthorize role gate on any endpoint here (any authenticated role may "
        + "call them) - per-row ownership is enforced entirely inside BookingServiceImpl.ensureOwnership "
        + "(ROLE_ADMIN bypasses; any other non-owning caller gets 403). Only ticket/verify is PUBLIC.")
public class BookingController {

    private static final String OWNER_SCOPE_DESCRIPTION = "ACCESS: AUTHENTICATED (any role).\n\n"
            + "SCOPE: Original booking owner only (Booking.userId) - no role-specific @PreAuthorize, but "
            + "ROLE_ADMIN bypasses the ownership check inside the service; any other non-owning caller gets 403.";

    private final BookingService bookingService;

    @PostMapping
    @Operation(summary = "Create a new booking", description = "ACCESS: AUTHENTICATED (any role).\n\n"
            + "IDENTITY: The booking owner is resolved from the authenticated JWT; BookingRequest carries no "
            + "userId/bookedBy field.")
    public ResponseEntity<ApiResponse<BookingResponse>> createBooking(@Valid @RequestBody BookingRequest request) {
        BookingResponse response = bookingService.createBooking(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(HttpStatus.CREATED.value(), "Booking created successfully", response, "/api/bookings"));
    }

    @GetMapping
    @Operation(summary = "Get bookings with optional filters", description = "ACCESS: AUTHENTICATED (any role).\n\n"
            + "SCOPE: Scoped to the caller's own bookings (Booking.userId) unless the caller is ROLE_ADMIN, in "
            + "which case the scope/status/reference/date filters apply across every traveler's bookings.")
    public ResponseEntity<ApiResponse<PaginatedSearchResponse<BookingHistoryResponse>>> getBookings(
            @RequestParam(required = false) String scope,
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) String reference,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 20) Pageable pageable) {
        PaginatedSearchResponse<BookingHistoryResponse> response = bookingService.getBookings(scope, status, reference, from, to, pageable);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Bookings fetched successfully", response, "/api/bookings"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get booking by ID", description = OWNER_SCOPE_DESCRIPTION)
    public ResponseEntity<ApiResponse<BookingResponse>> getBookingById(@PathVariable Long id) {
        BookingResponse response = bookingService.getBookingById(id);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Booking fetched successfully", response, "/api/bookings/" + id));
    }

    // ── Phase 6 – Booking Lifecycle ──────────────────────────────

    @PostMapping("/{id}/confirm")
    @Operation(summary = "Confirm a booking", description = OWNER_SCOPE_DESCRIPTION)
    public ResponseEntity<ApiResponse<BookingResponse>> confirmBooking(@PathVariable Long id) {
        BookingResponse response = bookingService.confirmBooking(id);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Booking confirmed successfully", response, "/api/bookings/" + id + "/confirm"));
    }

    @PutMapping("/modify")
    @Operation(summary = "Modify booking details", description = OWNER_SCOPE_DESCRIPTION)
    public ResponseEntity<ApiResponse<BookingResponse>> modifyBooking(@Valid @RequestBody BookingModificationRequest request) {
        BookingResponse response = bookingService.modifyBooking(request);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Booking modified successfully", response, "/api/bookings/modify"));
    }

    @GetMapping("/{id}/timeline")
    @Operation(summary = "Get booking timeline", description = OWNER_SCOPE_DESCRIPTION)
    public ResponseEntity<ApiResponse<List<BookingTimelineResponse>>> getBookingTimeline(@PathVariable Long id) {
        List<BookingTimelineResponse> response = bookingService.getBookingTimeline(id);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Booking timeline fetched successfully", response, "/api/bookings/" + id + "/timeline"));
    }

    // ── Phase 6 – Ticket Management ──────────────────────────────

    @GetMapping("/{id}/ticket")
    @Operation(summary = "Get ticket for a booking", description = OWNER_SCOPE_DESCRIPTION)
    public ResponseEntity<ApiResponse<TicketResponse>> getTicket(@PathVariable Long id) {
        TicketResponse response = bookingService.getTicket(id);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Ticket fetched successfully", response, "/api/bookings/" + id + "/ticket"));
    }

    @GetMapping("/ticket/verify/{ticketNumber}")
    @Operation(summary = "Verify ticket by ticket number", description = "ACCESS: PUBLIC (no JWT required - "
            + "explicitly permitted in SecurityConfig).\n\nSCOPE: The ticket number itself acts as the "
            + "credential for this lookup; not owner-scoped.")
    public ResponseEntity<ApiResponse<TicketResponse>> verifyTicket(@PathVariable String ticketNumber) {
        TicketResponse response = bookingService.verifyTicket(ticketNumber);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Ticket verified successfully", response, "/api/bookings/ticket/verify/" + ticketNumber));
    }

    // ── Phase 7 – Enhanced Cancellation ──────────────────────────

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel booking with optional reason", description = OWNER_SCOPE_DESCRIPTION)
    public ResponseEntity<ApiResponse<CancellationResponse>> cancelBooking(
            @PathVariable Long id,
            @RequestBody(required = false) CancellationRequest request) {
        CancellationResponse response = bookingService.cancelBookingUnified(id, request);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Booking cancelled successfully", response, "/api/bookings/" + id + "/cancel"));
    }

    @PostMapping("/cancel/partial")
    @Operation(summary = "Partially cancel booking (selected seats)", description = OWNER_SCOPE_DESCRIPTION)
    public ResponseEntity<ApiResponse<CancellationResponse>> partialCancelBooking(@Valid @RequestBody PartialCancellationRequest request) {
        CancellationResponse response = bookingService.partialCancelBooking(request);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Partial cancellation successful", response, "/api/bookings/cancel/partial"));
    }
}
