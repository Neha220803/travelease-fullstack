package com.travelease.backend.itinerary.repository;

import com.travelease.backend.itinerary.entity.ActivityBooking;
import com.travelease.backend.itinerary.entity.ActivityBookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface ActivityBookingRepository extends JpaRepository<ActivityBooking, UUID> {

    List<ActivityBooking> findByBookedBy_Id(UUID userId);

    List<ActivityBooking> findByActivitySlot_Activity_ActivityId(String activityId);

    List<ActivityBooking> findByTripId(UUID tripId);

    @Query("SELECT COALESCE(SUM(b.participantCount), 0) FROM ActivityBooking b "
            + "WHERE b.activitySlot.id = :slotId AND b.status IN :statuses")
    int sumParticipantsByActivitySlotIdAndStatusIn(
            @Param("slotId") UUID slotId,
            @Param("statuses") List<ActivityBookingStatus> statuses);

    @Query("SELECT COALESCE(SUM(b.totalAmount), 0) FROM ActivityBooking b "
            + "WHERE b.tripId = :tripId AND b.status <> 'CANCELLED'")
    BigDecimal sumSpentByTripId(@Param("tripId") UUID tripId);
}
