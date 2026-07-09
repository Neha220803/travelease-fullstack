package com.travelease.backend.auth.dto;

import java.util.UUID;

public record MeResponse(UUID id, String name, String email, String phone, String role, Long providerId, String securityQuestion) {
}
