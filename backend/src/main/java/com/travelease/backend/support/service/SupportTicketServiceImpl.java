package com.travelease.backend.support.service;

import com.travelease.backend.auth.entity.Role;
import com.travelease.backend.auth.entity.User;
import com.travelease.backend.auth.repository.UserRepository;
import com.travelease.backend.itinerary.service.NotificationService;
import com.travelease.backend.shared.exception.ResourceNotFoundException;
import com.travelease.backend.shared.exception.InvalidRequestException;
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
    private final com.travelease.backend.auth.repository.ProviderRepository providerRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public TicketResponse createTicket(CreateTicketRequest request, String currentUserEmail) {
        User submitter = getCurrentUser(currentUserEmail);
        SupportTicket ticket = new SupportTicket();
        ticket.setUser(submitter);
        ticket.setCategory(request.category());
        ticket.setSubject(request.subject());
        ticket.setDescription(request.description());
        ticket.setAssignedProviderId(request.assignedProviderId());
        ticket.setStatus(TicketStatus.OPEN);
        TicketResponse saved = toTicketResponse(ticketRepository.save(ticket));

        if (request.assignedProviderId() != null) {
            userRepository.findByProviderId(request.assignedProviderId()).forEach(providerUser ->
                notificationService.createNotification(
                        providerUser.getId().toString(),
                        "SUPPORT_TICKET",
                        "New Support Ticket",
                        submitter.getName() + " opened a new ticket: \"" + request.subject() + "\""
                )
            );
        } else {
            userRepository.findByRole(Role.ROLE_ADMIN).forEach(admin ->
                notificationService.createNotification(
                        admin.getId().toString(),
                        "SUPPORT_TICKET",
                        "New Support Ticket",
                        submitter.getName() + " opened a new ticket: \"" + request.subject() + "\""
                )
            );
        }

        return saved;
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
    public ReplyResponse addReply(UUID ticketId, ReplyRequest request, String currentUserEmail) {
        SupportTicket ticket = getTicket(ticketId);
        User sender = getCurrentUser(currentUserEmail);
        SupportTicketReply reply = new SupportTicketReply();
        reply.setTicket(ticket);
        reply.setMessage(request.message());
        reply.setSender(sender);
        SupportTicketReply saved = replyRepository.save(reply);

        // Notifications
        if (Objects.equals(sender.getId(), ticket.getUser().getId())) {
            // Sender is ticket creator. Notify assignee (Provider or Admin)
            if (ticket.getAssignedProviderId() != null) {
                userRepository.findByProviderId(ticket.getAssignedProviderId()).forEach(u -> 
                    notificationService.createNotification(u.getId().toString(), "TICKET_REPLY", "New Reply", sender.getName() + " replied to ticket: " + ticket.getSubject())
                );
            } else {
                userRepository.findByRole(Role.ROLE_ADMIN).forEach(admin -> 
                    notificationService.createNotification(admin.getId().toString(), "TICKET_REPLY", "New Reply", sender.getName() + " replied to ticket: " + ticket.getSubject())
                );
            }
        } else {
            // Sender is Admin or Provider. Notify ticket creator.
            notificationService.createNotification(ticket.getUser().getId().toString(), "TICKET_REPLY", "New Reply", sender.getName() + " replied to your ticket: " + ticket.getSubject());
        }

        return toReplyResponse(saved);
    }

    @Override
    @Transactional
    public TicketResponse updateStatus(UUID ticketId, UpdateTicketStatusRequest request, String currentUserEmail) {
        SupportTicket ticket = getTicket(ticketId);
        User updater = getCurrentUser(currentUserEmail);
        ticket.setStatus(request.status());
        TicketResponse saved = toTicketResponse(ticketRepository.save(ticket));

        if (!Objects.equals(updater.getId(), ticket.getUser().getId())) {
            notificationService.createNotification(ticket.getUser().getId().toString(), "TICKET_STATUS", "Status Updated", "Your ticket status was updated to " + request.status());
        }

        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TicketResponse> getTicketsAssignedToProvider(String currentUserEmail) {
        User user = getCurrentUser(currentUserEmail);
        if (user.getProviderId() == null) {
            throw new InvalidRequestException("User does not belong to a provider");
        }
        return ticketRepository.findByAssignedProviderIdOrderByCreatedAtDesc(user.getProviderId()).stream()
                .map(this::toTicketResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TicketDetailResponse getAssignedTicket(UUID ticketId, String currentUserEmail) {
        User user = getCurrentUser(currentUserEmail);
        SupportTicket ticket = getTicket(ticketId);
        if (user.getProviderId() == null || !Objects.equals(ticket.getAssignedProviderId(), user.getProviderId())) {
            throw new ResourceNotFoundException("Support ticket with id " + ticketId + " not found or not assigned to your provider");
        }
        return toDetailResponse(ticket);
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
        String providerName = null;
        if (ticket.getAssignedProviderId() != null) {
            providerName = providerRepository.findById(ticket.getAssignedProviderId())
                    .map(com.travelease.backend.auth.entity.Provider::getBusinessName)
                    .orElse("Unknown Provider");
        }
        return new TicketResponse(
                ticket.getId(),
                ticket.getUser().getId(),
                ticket.getUser().getName(),
                ticket.getCategory(),
                ticket.getSubject(),
                ticket.getDescription(),
                ticket.getStatus(),
                ticket.getAssignedProviderId(),
                providerName,
                ticket.getCreatedAt(),
                ticket.getUpdatedAt()
        );
    }

    private ReplyResponse toReplyResponse(SupportTicketReply reply) {
        String role = reply.getSender() != null ? reply.getSender().getRole().name() : null;
        String name = reply.getSender() != null ? reply.getSender().getName() : null;
        return new ReplyResponse(reply.getId(), reply.getMessage(), name, role, reply.getCreatedAt());
    }
}
