package com.travelease.backend.support.repository;

import com.travelease.backend.support.entity.SupportTicket;
import com.travelease.backend.support.entity.TicketCategory;
import com.travelease.backend.support.entity.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, UUID> {

    List<SupportTicket> findByUser_IdOrderByCreatedAtDesc(UUID userId);

    List<SupportTicket> findByCategoryAndStatusOrderByCreatedAtDesc(TicketCategory category, TicketStatus status);

    List<SupportTicket> findByCategoryOrderByCreatedAtDesc(TicketCategory category);

    List<SupportTicket> findByStatusOrderByCreatedAtDesc(TicketStatus status);

    List<SupportTicket> findAllByOrderByCreatedAtDesc();
}
