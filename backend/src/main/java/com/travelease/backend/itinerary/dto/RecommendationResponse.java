package com.travelease.backend.itinerary.dto;

/**
 * Superset of the raw Recommendation entity's fields (recommendationId,
 * categoryId, recommendationType, referenceId, rankOrder - kept for backward
 * compatibility with existing callers, e.g. TripOverviewTab's "Recommended
 * Activities" card) plus the referenced Activity's details, enriched here so
 * traveler-facing screens (e.g. the itinerary booking flow) never have to
 * make a second round trip or hardcode a price/provider name. Enrichment
 * fields are null for non-"Activity" recommendation types or a dangling
 * referenceId.
 */
public record RecommendationResponse(
        String recommendationId,
        Integer categoryId,
        String recommendationType,
        String referenceId,
        Integer rankOrder,
        String activityId,
        String activityName,
        String providerName,
        Double price,
        String startTime,
        String endTime,
        Integer destinationId
) {
}
