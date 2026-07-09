package com.travelease.backend.support.service;

import com.travelease.backend.auth.entity.Role;
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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SupportTicketServiceImplTest {

    @Mock
    private SupportTicketRepository ticketRepository;

    @Mock
    private SupportTicketReplyRepository replyRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private SupportTicketServiceImpl supportTicketService;

    private User sampleUser(String email) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setName("Alice Traveler");
        user.setEmail(email);
        user.setPhone("9999999999");
        user.setPasswordHash("hash");
        user.setRole(Role.ROLE_TRAVELER);
        return user;
    }

    private SupportTicket sampleTicket(User user) {
        SupportTicket ticket = new SupportTicket();
        ticket.setId(UUID.randomUUID());
        ticket.setUser(user);
        ticket.setCategory(TicketCategory.HOTEL);
        ticket.setSubject("Room was dirty");
        ticket.setDescription("The room had not been cleaned before check-in.");
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setCreatedAt(LocalDateTime.now());
        ticket.setUpdatedAt(LocalDateTime.now());
        return ticket;
    }

    @Test
    void createTicketSavesTicketOwnedByCurrentUser() {
        User user = sampleUser("alice@travelease.test");
        when(userRepository.findByEmail("alice@travelease.test")).thenReturn(Optional.of(user));
        when(ticketRepository.save(any(SupportTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateTicketRequest request =
                new CreateTicketRequest(TicketCategory.BUS, "Bus was late", "The bus arrived 2 hours late.");
        TicketResponse response = supportTicketService.createTicket(request, "alice@travelease.test");

        assertThat(response.userId()).isEqualTo(user.getId());
        assertThat(response.category()).isEqualTo(TicketCategory.BUS);
        assertThat(response.subject()).isEqualTo("Bus was late");
        assertThat(response.status()).isEqualTo(TicketStatus.OPEN);
    }

    @Test
    void getMyTicketsReturnsOnlyCurrentUsersTickets() {
        User user = sampleUser("alice@travelease.test");
        when(userRepository.findByEmail("alice@travelease.test")).thenReturn(Optional.of(user));
        when(ticketRepository.findByUser_IdOrderByCreatedAtDesc(user.getId()))
                .thenReturn(List.of(sampleTicket(user)));

        List<TicketResponse> result = supportTicketService.getMyTickets("alice@travelease.test");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).userId()).isEqualTo(user.getId());
    }

    @Test
    void getMyTicketReturnsDetailWithRepliesWhenOwnedByCaller() {
        User user = sampleUser("alice@travelease.test");
        SupportTicket ticket = sampleTicket(user);
        SupportTicketReply reply = new SupportTicketReply();
        reply.setId(UUID.randomUUID());
        reply.setTicket(ticket);
        reply.setMessage("We're looking into this.");
        reply.setCreatedAt(LocalDateTime.now());

        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));
        when(replyRepository.findByTicket_IdOrderByCreatedAtAsc(ticket.getId())).thenReturn(List.of(reply));

        TicketDetailResponse result = supportTicketService.getMyTicket(ticket.getId(), "alice@travelease.test");

        assertThat(result.ticket().ticketId()).isEqualTo(ticket.getId());
        assertThat(result.replies()).hasSize(1);
        assertThat(result.replies().get(0).message()).isEqualTo("We're looking into this.");
    }

    @Test
    void getMyTicketThrowsNotFoundWhenTicketBelongsToSomeoneElse() {
        User owner = sampleUser("alice@travelease.test");
        SupportTicket ticket = sampleTicket(owner);
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));

        assertThatThrownBy(() -> supportTicketService.getMyTicket(ticket.getId(), "bob@travelease.test"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getAllTicketsFiltersByCategoryAndStatusWhenBothProvided() {
        User user = sampleUser("alice@travelease.test");
        when(ticketRepository.findByCategoryAndStatusOrderByCreatedAtDesc(TicketCategory.HOTEL, TicketStatus.OPEN))
                .thenReturn(List.of(sampleTicket(user)));

        List<TicketResponse> result = supportTicketService.getAllTickets(TicketCategory.HOTEL, TicketStatus.OPEN);

        assertThat(result).hasSize(1);
    }

    @Test
    void getAllTicketsReturnsEveryTicketWhenNoFiltersProvided() {
        User user = sampleUser("alice@travelease.test");
        when(ticketRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(sampleTicket(user)));

        List<TicketResponse> result = supportTicketService.getAllTickets(null, null);

        assertThat(result).hasSize(1);
    }

    @Test
    void addReplySavesReplyAgainstTicket() {
        User user = sampleUser("alice@travelease.test");
        SupportTicket ticket = sampleTicket(user);
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));
        when(replyRepository.save(any(SupportTicketReply.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReplyResponse response =
                supportTicketService.addReply(ticket.getId(), new ReplyRequest("We're looking into this."));

        assertThat(response.message()).isEqualTo("We're looking into this.");
    }

    @Test
    void updateStatusChangesTicketStatus() {
        User user = sampleUser("alice@travelease.test");
        SupportTicket ticket = sampleTicket(user);
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any(SupportTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TicketResponse response =
                supportTicketService.updateStatus(ticket.getId(), new UpdateTicketStatusRequest(TicketStatus.RESOLVED));

        assertThat(response.status()).isEqualTo(TicketStatus.RESOLVED);
    }
}
