package com.travelease.backend.itinerary.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "itineraries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Itinerary {

    @Id
    @Column(name = "ItineraryID")
    private String itineraryId;

    @Column(name = "TripID", nullable = false)
    private String tripId;

    @Column(name = "ActivityID", nullable = false)
    private String activityId;

    /**
     * Snapshotted at creation time - either resolved from the referenced
     * Activity (provider-listed pick) or the traveler's own free-text entry
     * (custom plan, no ActivityID FK backing it). Never re-resolved on read,
     * so a later provider rename doesn't retroactively change what a trip
     * already planned.
     */
    @Column(name = "ActivityName")
    private String activityName;

    @Column(name = "ActivityDate")
    private LocalDate activityDate;

    @Column(name = "StartTime")
    private LocalDateTime startTime;

    @Column(name = "EndTime")
    private LocalDateTime endTime;

    @Column(name = "Status")
    private String status = "Pending";

    @Column(name = "CompletionTime")
    private LocalDateTime completionTime;
}