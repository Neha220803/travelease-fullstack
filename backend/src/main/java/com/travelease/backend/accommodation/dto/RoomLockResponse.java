package com.travelease.backend.accommodation.dto;

import com.travelease.backend.accommodation.entity.enums.RoomLockStatus;
import java.time.LocalDateTime;
import java.util.UUID;

public record RoomLockResponse(
        Long lockId,
        UUID roomId,
        LocalDateTime lockedAt,
        LocalDateTime expiresAt,
        RoomLockStatus status
) {
}
