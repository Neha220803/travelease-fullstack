package com.travelease.backend.support.controller;

import com.travelease.backend.shared.dto.ApiResponse;
import com.travelease.backend.support.dto.ReplyRequest;
import com.travelease.backend.support.dto.ReplyResponse;
import com.travelease.backend.support.dto.TicketDetailResponse;
import com.travelease.backend.support.dto.TicketResponse;
import com.travelease.backend.support.dto.UpdateTicketStatusRequest;
import com.travelease.backend.support.entity.TicketCategory;
import com.travelease.backend.support.entity.TicketStatus;
import com.travelease.backend.support.service.SupportTicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/support/tickets")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminSupportTicketController {

    private final SupportTicketService supportTicketService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getAllTickets(
            @RequestParam(required = false) TicketCategory category,
            @RequestParam(required = false) TicketStatus status
    ) {
        List<TicketResponse> response = supportTicketService.getAllTickets(category, status);
        return ResponseEntity.ok(ApiResponse.success(response, "Support tickets retrieved"));
    }

    @GetMapping("/{ticketId}")
    public ResponseEntity<ApiResponse<TicketDetailResponse>> getTicket(@PathVariable UUID ticketId) {
        TicketDetailResponse response = supportTicketService.getTicketForAdmin(ticketId);
        return ResponseEntity.ok(ApiResponse.success(response, "Support ticket retrieved"));
    }

    @PostMapping("/{ticketId}/replies")
    public ResponseEntity<ApiResponse<ReplyResponse>> addReply(
            @PathVariable UUID ticketId,
            @Valid @RequestBody ReplyRequest request
    ) {
        ReplyResponse response = supportTicketService.addReply(ticketId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Reply added"));
    }

    @PatchMapping("/{ticketId}/status")
    public ResponseEntity<ApiResponse<TicketResponse>> updateStatus(
            @PathVariable UUID ticketId,
            @Valid @RequestBody UpdateTicketStatusRequest request
    ) {
        TicketResponse response = supportTicketService.updateStatus(ticketId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Support ticket status updated"));
    }
}
