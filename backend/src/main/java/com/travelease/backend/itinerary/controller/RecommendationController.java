package com.travelease.backend.itinerary.controller;

import com.travelease.backend.auth.entity.Role;
import com.travelease.backend.auth.entity.User;
import com.travelease.backend.auth.repository.UserRepository;
import com.travelease.backend.itinerary.dto.RecommendationResponse;
import com.travelease.backend.itinerary.entity.Activity;
import com.travelease.backend.itinerary.entity.Recommendation;
import com.travelease.backend.itinerary.repository.ActivityRepository;
import com.travelease.backend.itinerary.repository.RecommendationRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
@CrossOrigin(origins = "http://localhost:4200")
@Tag(name = "Recommendations", description = "Public traveler recommendations by category")
public class RecommendationController {

    @Autowired
    private RecommendationRepository recommendationRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private UserRepository userRepository;

    // US-REC-01, US-23 — GET /api/recommendations?categoryId=&destinationId=
    // Get personalized suggestions by traveler category, optionally narrowed to
    // a destination. 1=Solo 2=Couple 3=Family 4=Friends 5=Corporate
    // destinationId is optional and additive: existing callers that only pass
    // categoryId (e.g. TripOverviewTab's "Recommended Activities" card) keep
    // working unfiltered; the itinerary booking flow passes both to only see
    // activities bookable at the trip's own destination.
    @GetMapping
    @Operation(summary = "Get traveler recommendations", description = "ACCESS: AUTHENTICATED\nSCOPE: Returns recommendation records for the requested traveler categoryId, optionally filtered to destinationId, enriched with the referenced activity's details.\nIDENTITY: A valid JWT is required (this endpoint is not in SecurityConfig's permitAll list); the docs previously and incorrectly claimed public access.")
    public ResponseEntity<List<RecommendationResponse>> getRecommendations(
            @RequestParam Integer categoryId,
            @RequestParam(required = false) Integer destinationId) {
        List<RecommendationResponse> recommendations = recommendationRepository
                .findByCategoryIdOrderByRankOrderAsc(categoryId)
                .stream()
                .map(this::enrich)
                .filter(r -> destinationId == null || destinationId.equals(r.destinationId()))
                .toList();
        return ResponseEntity.ok(recommendations);
    }

    private RecommendationResponse enrich(Recommendation recommendation) {
        Activity activity = "Activity".equals(recommendation.getRecommendationType())
                ? activityRepository.findById(recommendation.getReferenceId()).orElse(null)
                : null;

        if (activity == null) {
            return new RecommendationResponse(
                    recommendation.getRecommendationId(),
                    recommendation.getCategoryId(),
                    recommendation.getRecommendationType(),
                    recommendation.getReferenceId(),
                    recommendation.getRankOrder(),
                    null, null, null, null, null, null, null
            );
        }

        String providerName = activity.getProviderName() != null
                ? activity.getProviderName()
                : resolveProviderName(activity.getProviderId());

        return new RecommendationResponse(
                recommendation.getRecommendationId(),
                recommendation.getCategoryId(),
                recommendation.getRecommendationType(),
                recommendation.getReferenceId(),
                recommendation.getRankOrder(),
                activity.getActivityId(),
                activity.getActivityName(),
                providerName,
                activity.getPrice(),
                activity.getStartTime(),
                activity.getEndTime(),
                activity.getDestinationId()
        );
    }

    // Same fallback ActivityController.resolveProviderOption uses: Activity has
    // no human-readable provider name of its own unless explicitly seeded, so
    // resolve it from the owning ROLE_ACTIVITY_PROVIDER account.
    private String resolveProviderName(Long providerId) {
        return userRepository.findByProviderId(providerId).stream()
                .filter(user -> user.getRole() == Role.ROLE_ACTIVITY_PROVIDER)
                .map(User::getName)
                .findFirst()
                .orElse("Provider #" + providerId);
    }
}



