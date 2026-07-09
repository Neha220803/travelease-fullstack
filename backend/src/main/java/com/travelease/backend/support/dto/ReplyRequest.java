package com.travelease.backend.support.dto;

import jakarta.validation.constraints.NotBlank;

public record ReplyRequest(
        @NotBlank String message
) {
}
