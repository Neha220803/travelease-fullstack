package com.travelease.backend.itinerary.controller;

import com.travelease.backend.itinerary.dto.ActivitySlotResponse;
import com.travelease.backend.itinerary.entity.Activity;
import com.travelease.backend.itinerary.repository.ActivityRepository;
import com.travelease.backend.itinerary.service.ActivityBookingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/activities")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
@Tag(name = "Activity Catalog", description = "Read-only Activity catalog and slot discovery, consumed by both "
        + "the Itinerary dropdown and Activity Booking. Not exposed under SecurityConfig's public permitAll "
        + "list, so every endpoint here requires a valid JWT (any of the five roles), not a specific one.")
public class ActivityController {

    private final ActivityRepository activityRepository;
    private final ActivityBookingService activityBookingService;

    // US-ITI-01 — GET /api/activities?destinationId=
    // Get activities for dropdown when adding itinerary item
    @GetMapping
    @Operation(summary = "List Activities by destination (dropdown)", description = "ACCESS: AUTHENTICATED "
            + "(any of the five roles) - this path is not in SecurityConfig's permitAll list, so a missing/"
            + "invalid JWT returns 401 even though there is no role-specific @PreAuthorize.\n\n"
            + "SCOPE: Read-only catalog lookup, not owner/tenant scoped - returns every Activity Provider's "
            + "activities for the given destination.")
    public ResponseEntity<List<Activity>> getActivities(
            @RequestParam Integer destinationId) {
        List<Activity> activities = activityRepository
                .findByDestinationId(destinationId);
        return ResponseEntity.ok(activities);
    }

    // Traveler-facing slot discovery for booking - only slots that have not yet
    // started are returned, mirroring the eligibility rule enforced at booking
    // creation time (ActivityBookingServiceImpl.createBooking).
    @GetMapping("/{activityId}/slots")
    @Operation(summary = "List bookable future slots for an Activity", description = "ACCESS: AUTHENTICATED "
            + "(any of the five roles) - same public-permitAll caveat as above.\n\n"
            + "SCOPE: Read-only; returns only slots whose start date/time has not yet passed, mirroring the "
            + "eligibility rule enforced at ActivityBooking creation. Not owner/tenant scoped.\n\n"
            + "TEST NOTE: Seeded Activity f2000000-0000-0000-0000-000000000001 (Mumbai Heritage Walking Tour, "
            + "Activity Provider 201) has future slots pre-seeded for this.")
    public ResponseEntity<List<ActivitySlotResponse>> getBookableSlots(@PathVariable String activityId) {
        return ResponseEntity.ok(activityBookingService.getBookableSlots(activityId));
    }
}