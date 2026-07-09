package com.travelease.backend.support.service;

import com.travelease.backend.auth.entity.User;
import com.travelease.backend.auth.repository.UserRepository;
import com.travelease.backend.shared.exception.ResourceNotFoundException;
import com.travelease.backend.support.dto.CreateTicketRequest;
import com.travelease.backend.support.dto.ReplyRequest;
import com.travelease.backend.support.dto.ReplyResponse;
import com.travelease.backend.support.dto.TicketDetailResponse;
import com.travelease.backend.support.dto.TicketResponse;
import com.travelease.backend.support.dto.UpdateTicketStatusRequest;
import com.travelease.backend.support.entity.SupportTicket;
import com.travelease.backend.support.entity.SupportTicketReply;
import com.travelease.backend.support.entity.TicketCategory;
import com.travelease.backend.support.entity.TicketStatus;
import com.travelease.backend.support.repository.SupportTicketReplyRepository;
import com.travelease.backend.support.repository.SupportTicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupportTicketServiceImpl implements SupportTicketService {

    private final SupportTicketRepository ticketRepository;
    private final SupportTicketReplyRepository replyRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public TicketResponse createTicket(CreateTicketRequest request, String currentUserEmail) {
        SupportTicket ticket = new SupportTicket();
        ticket.setUser(getCurrentUser(currentUserEmail));
        ticket.setCategory(request.category());
        ticket.setSubject(request.subject());
        ticket.setDescription(request.description());
        ticket.setStatus(TicketStatus.OPEN);
        return toTicketResponse(ticketRepository.save(ticket));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TicketResponse> getMyTickets(String currentUserEmail) {
        User user = getCurrentUser(currentUserEmail);
        return ticketRepository.findByUser_IdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::toTicketResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TicketDetailResponse getMyTicket(UUID ticketId, String currentUserEmail) {
        SupportTicket ticket = getTicket(ticketId);
        ensureOwner(ticket, currentUserEmail);
        return toDetailResponse(ticket);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TicketResponse> getAllTickets(TicketCategory category, TicketStatus status) {
        List<SupportTicket> tickets;
        if (category != null && status != null) {
            tickets = ticketRepository.findByCategoryAndStatusOrderByCreatedAtDesc(category, status);
        } else if (category != null) {
            tickets = ticketRepository.findByCategoryOrderByCreatedAtDesc(category);
        } else if (status != null) {
            tickets = ticketRepository.findByStatusOrderByCreatedAtDesc(status);
        } else {
            tickets = ticketRepository.findAllByOrderByCreatedAtDesc();
        }
        return tickets.stream().map(this::toTicketResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TicketDetailResponse getTicketForAdmin(UUID ticketId) {
        return toDetailResponse(getTicket(ticketId));
    }

    @Override
    @Transactional
    public ReplyResponse addReply(UUID ticketId, ReplyRequest request) {
        SupportTicket ticket = getTicket(ticketId);
        SupportTicketReply reply = new SupportTicketReply();
        reply.setTicket(ticket);
        reply.setMessage(request.message());
        return toReplyResponse(replyRepository.save(reply));
    }

    @Override
    @Transactional
    public TicketResponse updateStatus(UUID ticketId, UpdateTicketStatusRequest request) {
        SupportTicket ticket = getTicket(ticketId);
        ticket.setStatus(request.status());
        return toTicketResponse(ticketRepository.save(ticket));
    }

    private SupportTicket getTicket(UUID ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Support ticket with id " + ticketId + " not found"));
    }

    private void ensureOwner(SupportTicket ticket, String email) {
        if (!Objects.equals(ticket.getUser().getEmail(), email)) {
            throw new ResourceNotFoundException("Support ticket with id " + ticket.getId() + " not found");
        }
    }

    private User getCurrentUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User with email " + email + " not found"));
    }

    private TicketDetailResponse toDetailResponse(SupportTicket ticket) {
        List<ReplyResponse> replies = replyRepository.findByTicket_IdOrderByCreatedAtAsc(ticket.getId()).stream()
                .map(this::toReplyResponse)
                .toList();
        return new TicketDetailResponse(toTicketResponse(ticket), replies);
    }

    private TicketResponse toTicketResponse(SupportTicket ticket) {
        return new TicketResponse(
                ticket.getId(),
                ticket.getUser().getId(),
                ticket.getUser().getName(),
                ticket.getCategory(),
                ticket.getSubject(),
                ticket.getDescription(),
                ticket.getStatus(),
                ticket.getCreatedAt(),
                ticket.getUpdatedAt()
        );
    }

    private ReplyResponse toReplyResponse(SupportTicketReply reply) {
        return new ReplyResponse(reply.getId(), reply.getMessage(), reply.getCreatedAt());
    }
}
