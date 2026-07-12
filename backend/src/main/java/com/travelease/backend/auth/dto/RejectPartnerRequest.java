package com.travelease.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record RejectPartnerRequest(
        @NotBlank(message = "Rejection reason is required")
        String reason
) {
}
