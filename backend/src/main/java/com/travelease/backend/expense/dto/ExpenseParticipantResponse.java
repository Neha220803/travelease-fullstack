package com.travelease.backend.expense.dto;

import com.travelease.backend.expense.entity.ExpenseParticipantStatus;

import java.math.BigDecimal;
import java.util.UUID;

public record ExpenseParticipantResponse(
        UUID userId,
        String name,
        BigDecimal shareAmount,
        ExpenseParticipantStatus status
) {
}
