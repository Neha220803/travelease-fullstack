package com.travelease.backend.support.service;

import com.travelease.backend.support.dto.CreateTicketRequest;
import com.travelease.backend.support.dto.ReplyRequest;
import com.travelease.backend.support.dto.ReplyResponse;
import com.travelease.backend.support.dto.TicketDetailResponse;
import com.travelease.backend.support.dto.TicketResponse;
import com.travelease.backend.support.dto.UpdateTicketStatusRequest;
import com.travelease.backend.support.entity.TicketCategory;
import com.travelease.backend.support.entity.TicketStatus;

import java.util.List;
import java.util.UUID;

public interface SupportTicketService {

    TicketResponse createTicket(CreateTicketRequest request, String currentUserEmail);

    List<TicketResponse> getMyTickets(String currentUserEmail);

    TicketDetailResponse getMyTicket(UUID ticketId, String currentUserEmail);

    List<TicketResponse> getAllTickets(TicketCategory category, TicketStatus status);

    TicketDetailResponse getTicketForAdmin(UUID ticketId);

    ReplyResponse addReply(UUID ticketId, ReplyRequest request);

    TicketResponse updateStatus(UUID ticketId, UpdateTicketStatusRequest request);
}
