package com.travelease.backend.accommodation.repository;

import com.travelease.backend.accommodation.entity.RoomLock;
import com.travelease.backend.accommodation.entity.enums.RoomLockStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface RoomLockRepository extends JpaRepository<RoomLock, Long> {

    @Query("SELECT r FROM RoomLock r WHERE r.room.id = :roomId AND r.status = 'LOCKED' AND r.expiresAt > :now AND (r.checkInDate < :checkOutDate AND r.checkOutDate > :checkInDate)")
    List<RoomLock> findActiveLocksForRoom(UUID roomId, LocalDate checkInDate, LocalDate checkOutDate, LocalDateTime now);

    @Query("SELECT r FROM RoomLock r WHERE r.room.id = :roomId AND r.userId = :userId AND r.status = 'LOCKED' AND r.expiresAt > :now AND r.checkInDate = :checkInDate AND r.checkOutDate = :checkOutDate")
    List<RoomLock> findValidLockForUser(UUID roomId, UUID userId, LocalDate checkInDate, LocalDate checkOutDate, LocalDateTime now);
}
