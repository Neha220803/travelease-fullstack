package com.travelease.backend.support.controller;

import com.travelease.backend.shared.dto.ApiResponse;
import com.travelease.backend.support.dto.ReplyRequest;
import com.travelease.backend.support.dto.ReplyResponse;
import com.travelease.backend.support.dto.TicketDetailResponse;
import com.travelease.backend.support.dto.TicketResponse;
import com.travelease.backend.support.dto.UpdateTicketStatusRequest;
import com.travelease.backend.support.service.SupportTicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/provider/support/tickets")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ROLE_PROVIDER', 'ROLE_HOTEL_PROVIDER', 'ROLE_ACTIVITY_PROVIDER')")
public class ProviderSupportTicketController {

    private final SupportTicketService supportTicketService;

    @GetMapping("/assigned")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getAssignedTickets(Authentication authentication) {
        List<TicketResponse> response = supportTicketService.getTicketsAssignedToProvider(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Assigned tickets retrieved"));
    }

    @GetMapping("/{ticketId}")
    public ResponseEntity<ApiResponse<TicketDetailResponse>> getTicket(
            @PathVariable UUID ticketId,
            Authentication authentication
    ) {
        TicketDetailResponse response = supportTicketService.getAssignedTicket(ticketId, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Support ticket retrieved"));
    }

    @PostMapping("/{ticketId}/replies")
    public ResponseEntity<ApiResponse<ReplyResponse>> addReply(
            @PathVariable UUID ticketId,
            @Valid @RequestBody ReplyRequest request,
            Authentication authentication
    ) {
        ReplyResponse response = supportTicketService.addReply(ticketId, request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Reply added"));
    }

    @PatchMapping("/{ticketId}/status")
    public ResponseEntity<ApiResponse<TicketResponse>> updateStatus(
            @PathVariable UUID ticketId,
            @Valid @RequestBody UpdateTicketStatusRequest request,
            Authentication authentication
    ) {
        TicketResponse response = supportTicketService.updateStatus(ticketId, request, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Support ticket status updated"));
    }
}
