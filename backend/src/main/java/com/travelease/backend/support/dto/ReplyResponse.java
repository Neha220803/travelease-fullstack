package com.travelease.backend.support.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ReplyResponse(
        UUID id,
        String message,
        String senderName,
        String senderRole,
        LocalDateTime createdAt
) {
}
