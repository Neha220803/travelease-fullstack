package com.travelease.backend.support.dto;

import com.travelease.backend.support.entity.TicketCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateTicketRequest(
        @NotNull TicketCategory category,
        @NotBlank String subject,
        @NotBlank(message = "Description is required")
        String description,
        Long assignedProviderId
) {
}
