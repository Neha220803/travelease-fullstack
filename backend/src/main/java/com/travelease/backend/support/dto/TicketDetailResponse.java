package com.travelease.backend.support.dto;

import java.util.List;

public record TicketDetailResponse(
        TicketResponse ticket,
        List<ReplyResponse> replies
) {
}
