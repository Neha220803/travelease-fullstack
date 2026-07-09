package com.travelease.backend.support.repository;

import com.travelease.backend.support.entity.SupportTicketReply;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SupportTicketReplyRepository extends JpaRepository<SupportTicketReply, UUID> {

    List<SupportTicketReply> findByTicket_IdOrderByCreatedAtAsc(UUID ticketId);
}
