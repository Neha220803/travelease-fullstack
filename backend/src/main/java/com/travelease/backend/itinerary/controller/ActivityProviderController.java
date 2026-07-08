package com.travelease.backend.itinerary.controller;

import com.travelease.backend.itinerary.dto.ActivityBookingResponse;
import com.travelease.backend.itinerary.dto.ActivityBookingStatusTransitionRequest;
import com.travelease.backend.itinerary.dto.ActivityProviderRequest;
import com.travelease.backend.itinerary.dto.ActivityProviderResponse;
import com.travelease.backend.itinerary.dto.ActivitySlotRequest;
import com.travelease.backend.itinerary.dto.ActivitySlotResponse;
import com.travelease.backend.itinerary.service.ActivityBookingService;
import com.travelease.backend.itinerary.service.ActivityProviderService;
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

/**
 * Activity Provider management only - the existing traveler/reference lookup
 * (GET /api/activities?destinationId=) stays on ActivityController, untouched.
 * Deliberately namespaced /api/activity-provider (not the shared /api/provider
 * Hotel already uses) to avoid a third provider type sharing an ambiguous,
 * generic-sounding prefix.
 */
@RestController
@RequestMapping("/api/activity-provider")
@RequiredArgsConstructor
@Tag(name = "Activity Provider Management", description = "Activity/ActivitySlot management and booking "
        + "oversight for ROLE_ACTIVITY_PROVIDER, a business actor distinct from ROLE_PROVIDER (transport) and "
        + "ROLE_HOTEL_PROVIDER. Tenant-isolated by Activity Provider providerId (User.providerId -> "
        + "Activity.providerId -> ActivitySlot -> ActivityBooking); one activity provider can never read or "
        + "mutate another's resources.")
public class ActivityProviderController {

    private final ActivityProviderService activityProviderService;
    private final ActivityBookingService activityBookingService;

    @PostMapping("/activities")
    @PreAuthorize("hasAnyRole('ADMIN','ACTIVITY_PROVIDER')")
    @Operation(summary = "Create an Activity", description = "ACCESS: ROLE_ACTIVITY_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: ROLE_ACTIVITY_PROVIDER is always assigned its own providerId server-side - a "
            + "client-supplied providerId in the request body is only honored for ROLE_ADMIN (and required "
            + "for ADMIN, since ADMIN has no own providerId to default to).\n\n"
            + "IDENTITY: Effective providerId is resolved and validated server-side via "
            + "SecurityUtil.resolveEffectiveActivityProviderId.\n\n"
            + "TEST NOTE: Login as activityprovider1@travelease.com (providerId 201) or "
            + "activityprovider2@travelease.com (providerId 202).")
    public ResponseEntity<ApiResponse<ActivityProviderResponse>> createActivity(
            @Valid @RequestBody ActivityProviderRequest request
    ) {
        ActivityProviderResponse response = activityProviderService.createActivity(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Activity created"));
    }

    @GetMapping("/activities")
    @PreAuthorize("hasAnyRole('ADMIN','ACTIVITY_PROVIDER')")
    @Operation(summary = "List own Activities", description = "ACCESS: ROLE_ACTIVITY_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: ROLE_ACTIVITY_PROVIDER always sees only its own Activities regardless of the providerId "
            + "query param (a mismatched value is rejected, not silently ignored). ROLE_ADMIN may pass any "
            + "providerId, or omit it to see every provider's Activities.")
    public ResponseEntity<ApiResponse<List<ActivityProviderResponse>>> activities(
            @Parameter(description = "Filter by Activity Provider tenant id. Ignored/forced to the caller's "
                    + "own id for ROLE_ACTIVITY_PROVIDER; free-form for ROLE_ADMIN.")
            @RequestParam(required = false) Long providerId
    ) {
        List<ActivityProviderResponse> response = activityProviderService.getProviderActivities(providerId);
        return ResponseEntity.ok(ApiResponse.success(response, "Provider activities retrieved"));
    }

    @GetMapping("/activities/{activityId}")
    @PreAuthorize("hasAnyRole('ADMIN','ACTIVITY_PROVIDER')")
    @Operation(summary = "Get own Activity details", description = "ACCESS: ROLE_ACTIVITY_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: Owning Activity Provider only (tenant-isolated by Activity.providerId). ROLE_ADMIN "
            + "bypasses the tenant check. Another provider's Activity id returns 403.")
    public ResponseEntity<ApiResponse<ActivityProviderResponse>> activityDetails(@PathVariable String activityId) {
        ActivityProviderResponse response = activityProviderService.getProviderActivity(activityId);
        return ResponseEntity.ok(ApiResponse.success(response, "Provider activity details retrieved"));
    }

    @PutMapping("/activities/{activityId}")
    @PreAuthorize("hasAnyRole('ADMIN','ACTIVITY_PROVIDER')")
    @Operation(summary = "Update an Activity", description = "ACCESS: ROLE_ACTIVITY_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: Owning Activity Provider only, same tenant isolation as GET above. ROLE_ADMIN bypasses.")
    public ResponseEntity<ApiResponse<ActivityProviderResponse>> updateActivity(
            @PathVariable String activityId,
            @Valid @RequestBody ActivityProviderRequest request
    ) {
        ActivityProviderResponse response = activityProviderService.updateActivity(activityId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Activity updated"));
    }

    @PostMapping("/activities/{activityId}/slots")
    @PreAuthorize("hasAnyRole('ADMIN','ACTIVITY_PROVIDER')")
    @Operation(summary = "Create an ActivitySlot", description = "ACCESS: ROLE_ACTIVITY_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: Only on an Activity owned by the caller's own providerId; ROLE_ADMIN bypasses.")
    public ResponseEntity<ApiResponse<ActivitySlotResponse>> createSlot(
            @PathVariable String activityId,
            @Valid @RequestBody ActivitySlotRequest request
    ) {
        ActivitySlotResponse response = activityProviderService.createSlot(activityId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Activity slot created"));
    }

    @GetMapping("/activities/{activityId}/slots")
    @PreAuthorize("hasAnyRole('ADMIN','ACTIVITY_PROVIDER')")
    @Operation(summary = "List ActivitySlots for own Activity (provider view)", description = "ACCESS: "
            + "ROLE_ACTIVITY_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: Owning Activity Provider only; ROLE_ADMIN bypasses. Unlike the Traveler-facing "
            + "GET /api/activities/{activityId}/slots, this returns every slot including past ones.")
    public ResponseEntity<ApiResponse<List<ActivitySlotResponse>>> slots(@PathVariable String activityId) {
        List<ActivitySlotResponse> response = activityProviderService.getSlots(activityId);
        return ResponseEntity.ok(ApiResponse.success(response, "Activity slots retrieved"));
    }

    @PutMapping("/activities/{activityId}/slots/{slotId}")
    @PreAuthorize("hasAnyRole('ADMIN','ACTIVITY_PROVIDER')")
    @Operation(summary = "Update an ActivitySlot", description = "ACCESS: ROLE_ACTIVITY_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: Owning Activity Provider only; ROLE_ADMIN bypasses.\n\n"
            + "LIFECYCLE/SAFETY: Once the slot has any non-cancelled ActivityBooking, its date/time can no "
            + "longer be changed, and capacity cannot be reduced below the number of already-booked "
            + "participants. Price and capacity increases remain editable at any time.")
    public ResponseEntity<ApiResponse<ActivitySlotResponse>> updateSlot(
            @PathVariable String activityId,
            @PathVariable UUID slotId,
            @Valid @RequestBody ActivitySlotRequest request
    ) {
        ActivitySlotResponse response = activityProviderService.updateSlot(activityId, slotId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Activity slot updated"));
    }

    @GetMapping("/activities/{activityId}/bookings")
    @PreAuthorize("hasAnyRole('ADMIN','ACTIVITY_PROVIDER')")
    @Operation(summary = "List ActivityBookings for own Activity", description = "ACCESS: "
            + "ROLE_ACTIVITY_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: Owning Activity Provider only (tenant-isolated via Activity.providerId); ROLE_ADMIN "
            + "bypasses. Returns bookings across every Traveler who booked this Activity's slots - this "
            + "provider-side visibility does not let the provider mutate a booking beyond attendance-marking "
            + "below.")
    public ResponseEntity<ApiResponse<List<ActivityBookingResponse>>> bookingsForActivity(
            @PathVariable String activityId
    ) {
        List<ActivityBookingResponse> response = activityBookingService.getBookingsForActivity(activityId);
        return ResponseEntity.ok(ApiResponse.success(response, "Activity bookings retrieved"));
    }

    @GetMapping("/bookings/{bookingId}")
    @PreAuthorize("hasAnyRole('ADMIN','ACTIVITY_PROVIDER')")
    @Operation(summary = "Get an ActivityBooking (provider view)", description = "ACCESS: "
            + "ROLE_ACTIVITY_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: Only bookings against the caller's own Activity/ActivitySlot resources; ROLE_ADMIN "
            + "bypasses. Another provider's booking id returns 403.")
    public ResponseEntity<ApiResponse<ActivityBookingResponse>> bookingDetails(@PathVariable UUID bookingId) {
        ActivityBookingResponse response = activityBookingService.getProviderBooking(bookingId);
        return ResponseEntity.ok(ApiResponse.success(response, "Activity booking retrieved"));
    }

    @PutMapping("/bookings/{bookingId}/attendance")
    @PreAuthorize("hasAnyRole('ADMIN','ACTIVITY_PROVIDER')")
    @Operation(summary = "Mark ActivityBooking attendance (ATTENDED/NO_SHOW)", description = "ACCESS: "
            + "ROLE_ACTIVITY_PROVIDER or ROLE_ADMIN.\n\n"
            + "SCOPE: Only on the caller's own Activity Provider resources; ROLE_ADMIN bypasses. Only a "
            + "CONFIRMED booking can be transitioned, only to ATTENDED or NO_SHOW (not CANCELLED - cancellation "
            + "remains the booking owner's own action on a separate endpoint), and only after the slot's start "
            + "date/time has passed.\n\n"
            + "LIFECYCLE NOTE: If this booking is attached to a Traveler Trip, the attachment and the Trip's "
            + "shared view are unaffected other than reflecting the new status; this endpoint never grants the "
            + "Activity Provider access to the Traveler Trip itself.")
    public ResponseEntity<ApiResponse<ActivityBookingResponse>> markAttendance(
            @PathVariable UUID bookingId,
            @Valid @RequestBody ActivityBookingStatusTransitionRequest request
    ) {
        ActivityBookingResponse response = activityBookingService.markAttendance(bookingId, request.status());
        return ResponseEntity.ok(ApiResponse.success(response, "Activity booking attendance updated"));
    }
}
