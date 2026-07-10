package com.travelease.backend.itinerary.mapper;

import com.travelease.backend.itinerary.dto.ItineraryRequest;
import com.travelease.backend.itinerary.dto.ItineraryResponse;
import com.travelease.backend.itinerary.dto.NotificationResponse;
import com.travelease.backend.itinerary.entity.Activity;
import com.travelease.backend.itinerary.entity.Itinerary;
import com.travelease.backend.itinerary.entity.Notification;
import com.travelease.backend.itinerary.repository.ActivityRepository;
import com.travelease.backend.shared.exception.InvalidRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ItineraryMapper {

    private final ActivityRepository activityRepository;

    // Convert ItineraryRequest (from Angular) → Itinerary Entity (to save in DB)
    // activityName is resolved and snapshotted here, once, at creation time:
    //  - a real activityId must reference an existing provider-listed Activity
    //    (its name is looked up and used - a client-supplied activityName is
    //    ignored for these, so a traveler can't spoof a provider's listing).
    //  - a blank/absent activityId means a traveler's own free-text plan; a
    //    synthetic activityId is generated (the column is NOT NULL) and the
    //    client-supplied activityName is used directly.
    public Itinerary toEntity(ItineraryRequest request) {
        Itinerary itinerary = new Itinerary();
        itinerary.setTripId(request.getTripId());
        itinerary.setActivityDate(request.getActivityDate());
        itinerary.setStartTime(request.getStartTime());
        itinerary.setEndTime(request.getEndTime());
        itinerary.setStatus(request.getStatus() != null
                ? request.getStatus() : "Pending");

        if (request.getActivityId() != null && !request.getActivityId().isBlank()) {
            Activity activity = activityRepository.findById(request.getActivityId())
                    .orElseThrow(() -> new InvalidRequestException(
                            "Activity with id " + request.getActivityId() + " not found"));
            itinerary.setActivityId(activity.getActivityId());
            itinerary.setActivityName(activity.getActivityName());
        } else {
            if (request.getActivityName() == null || request.getActivityName().isBlank()) {
                throw new InvalidRequestException(
                        "Either activityId (a listed activity) or activityName (your own plan) is required");
            }
            itinerary.setActivityId("custom-" + UUID.randomUUID());
            itinerary.setActivityName(request.getActivityName().trim());
        }
        return itinerary;
    }

    // Convert Itinerary Entity (from DB) → ItineraryResponse (to send to Angular)
    public ItineraryResponse toResponse(Itinerary itinerary) {
        ItineraryResponse response = new ItineraryResponse();
        response.setItineraryId(itinerary.getItineraryId());
        response.setTripId(itinerary.getTripId());
        response.setActivityId(itinerary.getActivityId());
        response.setActivityName(itinerary.getActivityName());
        response.setActivityDate(itinerary.getActivityDate());
        response.setStartTime(itinerary.getStartTime());
        response.setEndTime(itinerary.getEndTime());
        response.setStatus(itinerary.getStatus());
        response.setCompletionTime(itinerary.getCompletionTime());
        return response;
    }

    // Convert Notification Entity (from DB) → NotificationResponse (to Angular)
    public NotificationResponse toNotificationResponse(Notification notification) {
        NotificationResponse response = new NotificationResponse();
        response.setNotificationId(notification.getNotificationId());
        response.setUserId(notification.getUserId());
        response.setNotificationType(notification.getNotificationType());
        response.setTitle(notification.getTitle());
        response.setMessage(notification.getMessage());
        response.setIsRead(notification.getIsRead());
        response.setCreatedDate(notification.getCreatedDate());
        return response;
    }
}