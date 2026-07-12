package com.travelease.backend.support.dto;

import com.travelease.backend.support.entity.TicketCategory;
import com.travelease.backend.support.entity.TicketStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record TicketResponse(
        UUID ticketId,
        UUID userId,
        String userName,
        TicketCategory category,
        String subject,
        String description,
        TicketStatus status,
        Long assignedProviderId,
        String assignedProviderName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
