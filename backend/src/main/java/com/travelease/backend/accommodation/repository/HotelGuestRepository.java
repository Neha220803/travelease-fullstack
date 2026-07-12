package com.travelease.backend.accommodation.repository;

import com.travelease.backend.accommodation.entity.HotelGuest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface HotelGuestRepository extends JpaRepository<HotelGuest, Long> {
    List<HotelGuest> findByHotelBooking_Id(UUID bookingId);
}
