package com.travelease.backend.busbooking.repository;

import com.travelease.backend.busbooking.entity.Seat;
import com.travelease.backend.busbooking.entity.enums.SeatStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {

    List<Seat> findByBusId(Long busId);

    List<Seat> findByBusIdAndStatus(Long busId, SeatStatus status);

    // Excludes both seats on a CONFIRMED booking and seats another user
    // currently holds an active (unexpired) lock on for this schedule -
    // without the second exclusion, the seat grid could show a seat as
    // available when it's already held, only failing on click/submit.
    @Query("SELECT s FROM Seat s WHERE s.bus.id = " +
           "(SELECT sc.bus.id FROM BusSchedule sc WHERE sc.id = :scheduleId) " +
           "AND s.status = 'AVAILABLE' " +
           "AND s.id NOT IN (" +
           "  SELECT bs.seat.id FROM BookingSeat bs " +
           "  WHERE bs.booking.schedule.id = :scheduleId " +
           "  AND bs.booking.status = 'CONFIRMED'" +
           ") " +
           "AND s.id NOT IN (" +
           "  SELECT sl.seat.id FROM SeatLock sl " +
           "  WHERE sl.scheduleId = :scheduleId " +
           "  AND sl.status = 'LOCKED' " +
           "  AND sl.expiresAt > CURRENT_TIMESTAMP" +
           ")")
    List<Seat> findAvailableSeatsForSchedule(@Param("scheduleId") Long scheduleId);
}
