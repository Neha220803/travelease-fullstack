package com.travelease.backend.accommodation.repository;

import com.travelease.backend.accommodation.entity.HotelBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface HotelBookingRepository extends JpaRepository<HotelBooking, UUID> {

    List<HotelBooking> findByTripId(UUID tripId);

    List<HotelBooking> findByHotelId(UUID hotelId);

    List<HotelBooking> findByBookedByEmail(String email);

    List<HotelBooking> findByHotel_ProviderId(Long providerId);

    @Query("SELECT COALESCE(SUM(h.totalAmount), 0) FROM HotelBooking h "
            + "WHERE h.tripId = :tripId AND h.bookingStatus <> 'CANCELLED'")
    BigDecimal sumSpentByTripId(@Param("tripId") UUID tripId);

    @Query("SELECT h FROM HotelBooking h WHERE h.roomNumber = :roomId AND h.bookingStatus <> 'CANCELLED' " +
           "AND (h.checkInDate < :checkOutDate AND h.checkOutDate > :checkInDate)")
    List<HotelBooking> findOverlappingBookings(@Param("roomId") String roomId, @Param("checkInDate") java.time.LocalDate checkInDate, @Param("checkOutDate") java.time.LocalDate checkOutDate);
}
