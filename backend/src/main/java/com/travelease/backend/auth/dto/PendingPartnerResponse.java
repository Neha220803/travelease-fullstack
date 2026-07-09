package com.travelease.backend.auth.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record PendingPartnerResponse(UUID id, String name, String email, String role, LocalDateTime createdAt) {
}
