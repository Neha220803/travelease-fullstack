package com.travelease.backend.auth.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AllPartnerResponse(
        UUID id,
        String name,
        String email,
        String role,
        String status,
        String rejectionReason,
        LocalDateTime createdAt
) {
}
