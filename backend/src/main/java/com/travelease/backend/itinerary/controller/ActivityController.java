package com.travelease.backend.itinerary.controller;

import com.travelease.backend.auth.entity.Role;
import com.travelease.backend.auth.entity.User;
import com.travelease.backend.auth.repository.UserRepository;
import com.travelease.backend.itinerary.dto.ActivityProviderOption;
import com.travelease.backend.itinerary.dto.ActivitySlotResponse;
import com.travelease.backend.itinerary.entity.Activity;
import com.travelease.backend.itinerary.repository.ActivityRepository;
import com.travelease.backend.itinerary.service.ActivityBookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/activities")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityRepository activityRepository;
    private final ActivityBookingService activityBookingService;
    private final UserRepository userRepository;

    // US-ITI-01 — GET /api/activities?destinationId=
    // Get activities for dropdown when adding itinerary item
    @GetMapping
    public ResponseEntity<List<Activity>> getActivities(
            @RequestParam Integer destinationId) {
        List<Activity> activities = activityRepository
                .findByDestinationId(destinationId);
        return ResponseEntity.ok(activities);
    }

    // Traveler-facing "pick a provider first" step for the itinerary Add
    // Activity flow: every distinct Activity Provider tenant that has at
    // least one activity listed at this destination, with their display name
    // resolved from their ROLE_ACTIVITY_PROVIDER account (Activity itself has
    // no human-readable provider name, only the numeric providerId FK).
    @GetMapping("/providers")
    public ResponseEntity<List<ActivityProviderOption>> getProviders(
            @RequestParam Integer destinationId) {
        Set<Long> providerIds = activityRepository.findByDestinationId(destinationId).stream()
                .map(Activity::getProviderId)
                .collect(Collectors.toSet());

        List<ActivityProviderOption> providers = providerIds.stream()
                .map(this::resolveProviderOption)
                .sorted(Comparator.comparing(ActivityProviderOption::providerName))
                .toList();
        return ResponseEntity.ok(providers);
    }

    private ActivityProviderOption resolveProviderOption(Long providerId) {
        String name = userRepository.findByProviderId(providerId).stream()
                .filter(user -> user.getRole() == Role.ROLE_ACTIVITY_PROVIDER)
                .map(User::getName)
                .findFirst()
                .orElse("Provider #" + providerId);
        return new ActivityProviderOption(providerId, name);
    }

    // Traveler-facing slot discovery for booking - only slots that have not yet
    // started are returned, mirroring the eligibility rule enforced at booking
    // creation time (ActivityBookingServiceImpl.createBooking).
    @GetMapping("/{activityId}/slots")
    public ResponseEntity<List<ActivitySlotResponse>> getBookableSlots(@PathVariable String activityId) {
        return ResponseEntity.ok(activityBookingService.getBookableSlots(activityId));
    }
}