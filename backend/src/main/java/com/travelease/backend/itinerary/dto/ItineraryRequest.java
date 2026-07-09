package com.travelease.backend.itinerary.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ItineraryRequest {

    private String tripId;
    private String activityId;
    /**
     * Only used when activityId is blank/absent - the traveler's own
     * free-text plan (e.g. a place they already know about) rather than a
     * pick from a provider's listed activities.
     */
    private String activityName;
    private LocalDate activityDate;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;
}