package com.travelease.backend.support.controller;

import com.travelease.backend.shared.dto.ApiResponse;
import com.travelease.backend.support.dto.CreateTicketRequest;
import com.travelease.backend.support.dto.TicketDetailResponse;
import com.travelease.backend.support.dto.TicketResponse;
import com.travelease.backend.support.dto.ReplyResponse;
import com.travelease.backend.support.service.SupportTicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/support/tickets")
@RequiredArgsConstructor
public class SupportTicketController {

    private final SupportTicketService supportTicketService;

    @PostMapping
    public ResponseEntity<ApiResponse<TicketResponse>> createTicket(
            @Valid @RequestBody CreateTicketRequest request,
            Authentication authentication
    ) {
        TicketResponse response = supportTicketService.createTicket(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Support ticket created"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getMyTickets(Authentication authentication) {
        List<TicketResponse> response = supportTicketService.getMyTickets(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Support tickets retrieved"));
    }

    @GetMapping("/{ticketId}")
    public ResponseEntity<ApiResponse<TicketDetailResponse>> getMyTicket(
            @PathVariable UUID ticketId,
            Authentication authentication
    ) {
        TicketDetailResponse response = supportTicketService.getMyTicket(ticketId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Support ticket retrieved"));
    }

    @PostMapping("/{ticketId}/replies")
    public ResponseEntity<ApiResponse<ReplyResponse>> addReply(
            @PathVariable UUID ticketId,
            @Valid @RequestBody com.travelease.backend.support.dto.ReplyRequest request,
            Authentication authentication
    ) {
        ReplyResponse response = supportTicketService.addReply(ticketId, request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Reply added"));
    }
}
