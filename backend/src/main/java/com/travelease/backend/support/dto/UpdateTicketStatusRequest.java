package com.travelease.backend.support.dto;

import com.travelease.backend.support.entity.TicketStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateTicketStatusRequest(
        @NotNull TicketStatus status
) {
}
