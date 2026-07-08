package com.travelease.backend.support.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ReplyResponse(
        UUID replyId,
        String message,
        LocalDateTime createdAt
) {
}
