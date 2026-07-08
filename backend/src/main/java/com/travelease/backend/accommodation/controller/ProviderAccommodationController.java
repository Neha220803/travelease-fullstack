package com.travelease.backend.accommodation.controller;

import com.travelease.backend.accommodation.dto.HotelBookingResponse;
import com.travelease.backend.accommodation.dto.HotelDetailsResponse;
import com.travelease.backend.accommodation.dto.HotelPolicyRequest;
import com.travelease.backend.accommodation.dto.HotelRequest;
import com.travelease.backend.accommodation.dto.HotelResponse;
import com.travelease.backend.accommodation.dto.RoomAvailabilityRequest;
import com.travelease.backend.accommodation.dto.RoomRequest;
import com.travelease.backend.accommodation.dto.RoomResponse;
import com.travelease.backend.accommodation.service.AccommodationService;
import com.travelease.backend.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/provider")
@RequiredArgsConstructor
@Tag(name = "Hotel Provider Management", description = "Hotel/Room management and guest check-in/out for "
        + "ROLE_HOTEL_PROVIDER, a business actor distinct from ROLE_PROVIDER (transport) and "
        + "ROLE_ACTIVITY_PROVIDER. Tenant-isolated by Hotel Provider providerId (User.providerId -> "
        + "Hotel.providerId -> Room / HotelBooking); one hotel provider can never read or mutate another's "
        + "resources.")
public class ProviderAccommodationController {

    private final AccommodationService accommodationService;

    @PostMapping("/hotels")
    @PreAuthorize("hasAnyRole('ADMIN','HOTEL_PROVIDER')")
    @Operation(summary = "Create a Hotel", description = "ACCESS: ROLE_HOTEL_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: ROLE_HOTEL_PROVIDER is always assigned its own providerId server-side; a client-supplied "
            + "providerId in the request body is only honored for ROLE_ADMIN.\n\n"
            + "IDENTITY: Effective providerId is resolved and validated server-side.\n\n"
            + "TEST NOTE: Login as hotelprovider1@travelease.com (providerId 101) or "
            + "hotelprovider2@travelease.com (providerId 102).")
    public ResponseEntity<ApiResponse<HotelResponse>> createHotel(@Valid @RequestBody HotelRequest request) {
        HotelResponse response = accommodationService.createHotel(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Hotel created"));
    }

    @GetMapping("/hotels")
    @PreAuthorize("hasAnyRole('ADMIN','HOTEL_PROVIDER')")
    @Operation(summary = "List own Hotels", description = "ACCESS: ROLE_HOTEL_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: ROLE_HOTEL_PROVIDER always sees only its own hotels regardless of the providerId query "
            + "param. ROLE_ADMIN may pass any providerId or omit it to see every provider's hotels.")
    public ResponseEntity<ApiResponse<List<HotelResponse>>> hotels(
            @Parameter(description = "Filter by Hotel Provider tenant id. Forced to the caller's own id for "
                    + "ROLE_HOTEL_PROVIDER; free-form for ROLE_ADMIN.")
            @RequestParam(required = false) Long providerId
    ) {
        List<HotelResponse> response = accommodationService.getProviderHotels(providerId);
        return ResponseEntity.ok(ApiResponse.success(response, "Provider hotels retrieved"));
    }

    @GetMapping("/hotels/{hotelId}")
    @PreAuthorize("hasAnyRole('ADMIN','HOTEL_PROVIDER')")
    @Operation(summary = "Get own Hotel details (provider view)", description = "ACCESS: ROLE_HOTEL_PROVIDER "
            + "or ROLE_ADMIN.\n\n"
            + "SCOPE: Owning Hotel Provider only (tenant-isolated by Hotel.providerId); ROLE_ADMIN bypasses. "
            + "Another provider's hotel id returns 403.")
    public ResponseEntity<ApiResponse<HotelDetailsResponse>> hotelDetails(@PathVariable UUID hotelId) {
        HotelDetailsResponse response = accommodationService.getProviderHotelDetails(hotelId);
        return ResponseEntity.ok(ApiResponse.success(response, "Provider hotel details retrieved"));
    }

    @PutMapping("/hotels/{hotelId}")
    @PreAuthorize("hasAnyRole('ADMIN','HOTEL_PROVIDER')")
    @Operation(summary = "Update a Hotel", description = "ACCESS: ROLE_HOTEL_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: Owning Hotel Provider only, same tenant isolation as GET above; ROLE_ADMIN bypasses.")
    public ResponseEntity<ApiResponse<HotelResponse>> updateHotel(
            @PathVariable UUID hotelId,
            @Valid @RequestBody HotelRequest request
    ) {
        HotelResponse response = accommodationService.updateHotel(hotelId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Hotel updated"));
    }

    @PostMapping("/hotels/{hotelId}/rooms")
    @PreAuthorize("hasAnyRole('ADMIN','HOTEL_PROVIDER')")
    @Operation(summary = "Create a Room", description = "ACCESS: ROLE_HOTEL_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: Only on a Hotel owned by the caller's own providerId; ROLE_ADMIN bypasses.")
    public ResponseEntity<ApiResponse<RoomResponse>> createRoom(
            @PathVariable UUID hotelId,
            @Valid @RequestBody RoomRequest request
    ) {
        RoomResponse response = accommodationService.createRoom(hotelId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Room created"));
    }

    @GetMapping("/hotels/{hotelId}/rooms")
    @PreAuthorize("hasAnyRole('ADMIN','HOTEL_PROVIDER')")
    @Operation(summary = "List Rooms for own Hotel", description = "ACCESS: ROLE_HOTEL_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: Owning Hotel Provider only; ROLE_ADMIN bypasses.")
    public ResponseEntity<ApiResponse<List<RoomResponse>>> rooms(@PathVariable UUID hotelId) {
        List<RoomResponse> response = accommodationService.getRooms(hotelId);
        return ResponseEntity.ok(ApiResponse.success(response, "Rooms retrieved"));
    }

    @PutMapping("/hotels/{hotelId}/rooms/{roomId}")
    @PreAuthorize("hasAnyRole('ADMIN','HOTEL_PROVIDER')")
    @Operation(summary = "Update a Room", description = "ACCESS: ROLE_HOTEL_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: Owning Hotel Provider only; ROLE_ADMIN bypasses.")
    public ResponseEntity<ApiResponse<RoomResponse>> updateRoom(
            @PathVariable UUID hotelId,
            @PathVariable UUID roomId,
            @Valid @RequestBody RoomRequest request
    ) {
        RoomResponse response = accommodationService.updateRoom(hotelId, roomId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Room updated"));
    }

    @PutMapping("/rooms/{roomId}/availability")
    @PreAuthorize("hasAnyRole('ADMIN','HOTEL_PROVIDER')")
    @Operation(summary = "Update Room availability", description = "ACCESS: ROLE_HOTEL_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: Owning Hotel Provider only (resolved via the room's own hotel); ROLE_ADMIN bypasses.")
    public ResponseEntity<ApiResponse<RoomResponse>> updateAvailability(
            @PathVariable UUID roomId,
            @Valid @RequestBody RoomAvailabilityRequest request
    ) {
        RoomResponse response = accommodationService.updateAvailability(roomId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Room availability updated"));
    }

    @PutMapping("/rooms/{roomId}/maintenance")
    @PreAuthorize("hasAnyRole('ADMIN','HOTEL_PROVIDER')")
    @Operation(summary = "Block a Room for maintenance", description = "ACCESS: ROLE_HOTEL_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: Owning Hotel Provider only; ROLE_ADMIN bypasses.")
    public ResponseEntity<ApiResponse<RoomResponse>> maintenance(@PathVariable UUID roomId) {
        RoomResponse response = accommodationService.blockMaintenance(roomId);
        return ResponseEntity.ok(ApiResponse.success(response, "Room blocked for maintenance"));
    }

    @GetMapping("/inventory")
    @PreAuthorize("hasAnyRole('ADMIN','HOTEL_PROVIDER')")
    @Operation(summary = "Get Room inventory calendar", description = "ACCESS: ROLE_HOTEL_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: ROLE_HOTEL_PROVIDER always scoped to its own providerId regardless of the query param; "
            + "ROLE_ADMIN may pass any providerId or omit it.")
    public ResponseEntity<ApiResponse<List<RoomResponse>>> inventory(
            @Parameter(description = "Filter by Hotel Provider tenant id. Forced to the caller's own id for "
                    + "ROLE_HOTEL_PROVIDER; free-form for ROLE_ADMIN.")
            @RequestParam(required = false) Long providerId
    ) {
        List<RoomResponse> response = accommodationService.getInventory(providerId);
        return ResponseEntity.ok(ApiResponse.success(response, "Inventory calendar retrieved"));
    }

    @PutMapping("/hotels/{hotelId}/policies")
    @PreAuthorize("hasAnyRole('ADMIN','HOTEL_PROVIDER')")
    @Operation(summary = "Update Hotel policies", description = "ACCESS: ROLE_HOTEL_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: Owning Hotel Provider only; ROLE_ADMIN bypasses.")
    public ResponseEntity<ApiResponse<HotelResponse>> updatePolicies(
            @PathVariable UUID hotelId,
            @Valid @RequestBody HotelPolicyRequest request
    ) {
        HotelResponse response = accommodationService.updatePolicies(hotelId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Hotel policies updated"));
    }

    @PutMapping("/hotel-bookings/{bookingId}/check-in")
    @PreAuthorize("hasAnyRole('ADMIN','HOTEL_PROVIDER')")
    @Operation(summary = "Check in a guest", description = "ACCESS: ROLE_HOTEL_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: Only for a booking against the caller's own Hotel resources; ROLE_ADMIN bypasses. This "
            + "provider-side action does not grant the Hotel Provider any Traveler Trip access, even if the "
            + "booking is attached to one.")
    public ResponseEntity<ApiResponse<HotelBookingResponse>> checkIn(@PathVariable UUID bookingId) {
        HotelBookingResponse response = accommodationService.checkIn(bookingId);
        return ResponseEntity.ok(ApiResponse.success(response, "Guest checked in"));
    }

    @PutMapping("/hotel-bookings/{bookingId}/check-out")
    @PreAuthorize("hasAnyRole('ADMIN','HOTEL_PROVIDER')")
    @Operation(summary = "Check out a guest", description = "ACCESS: ROLE_HOTEL_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: Only for a booking against the caller's own Hotel resources; ROLE_ADMIN bypasses.")
    public ResponseEntity<ApiResponse<HotelBookingResponse>> checkOut(@PathVariable UUID bookingId) {
        HotelBookingResponse response = accommodationService.checkOut(bookingId);
        return ResponseEntity.ok(ApiResponse.success(response, "Guest checked out"));
    }
}
