package com.travelease.backend.settlement.service;

import com.travelease.backend.auth.entity.Role;
import com.travelease.backend.auth.entity.User;
import com.travelease.backend.auth.repository.UserRepository;
import com.travelease.backend.expense.repository.ExpenseParticipantRepository;
import com.travelease.backend.settlement.dto.SettlementSummaryResponse;
import com.travelease.backend.settlement.mapper.SettlementMapper;
import com.travelease.backend.settlement.repository.SettlementRepository;
import com.travelease.backend.trip.entity.Trip;
import com.travelease.backend.trip.entity.TravelerTripStatus;
import com.travelease.backend.trip.entity.TripMemberStatus;
import com.travelease.backend.trip.repository.TripMemberRepository;
import com.travelease.backend.trip.repository.TripRepository;
import com.travelease.backend.trip.security.TripAuthorizationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Phase 4 fix: getTripSummary/getMySettlements' shared recalculateSettlements
 * membership check is now centralized onto TripAuthorizationService, gaining
 * the same ADMIN bypass Itinerary/Trip-attachment/Budget/Expense already have.
 * markPaid is untouched - it uses a narrower, correct, different rule
 * (settlement participant identity, not Trip membership) and is not part of
 * this centralization.
 */
@ExtendWith(MockitoExtension.class)
class SettlementServiceImplAuthorizationTest {

    @Mock
    private SettlementRepository settlementRepository;
    @Mock
    private ExpenseParticipantRepository expenseParticipantRepository;
    @Mock
    private TripRepository tripRepository;
    @Mock
    private TripMemberRepository tripMemberRepository;
    @Mock
    private UserRepository userRepository;

    private SettlementServiceImpl settlementService;

    private void setUp() {
        settlementService = new SettlementServiceImpl(
                settlementRepository, expenseParticipantRepository, tripRepository, tripMemberRepository,
                userRepository, new TripAuthorizationService(tripMemberRepository), new SettlementMapper());
    }

    private User user(String email, Role role) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setName(email);
        user.setRole(role);
        return user;
    }

    private Trip trip(User organizer) {
        Trip trip = new Trip();
        trip.setId(UUID.randomUUID());
        trip.setTripName("Goa Trip");
        trip.setOrganizer(organizer);
        trip.setSourceLocation("Mumbai");
        trip.setDestinationId(1);
        trip.setBudgetAmount(new BigDecimal("1000.00"));
        trip.setCategoryId(1);
        trip.setStartDate(LocalDate.now().plusDays(5));
        trip.setEndDate(LocalDate.now().plusDays(10));
        trip.setStatus(TravelerTripStatus.PLANNING);
        return trip;
    }

    @Test
    void adminBypassesMembershipCheckForTripSummary() {
        setUp();
        User alice = user("alice@travelease.test", Role.ROLE_TRAVELER);
        User admin = user("admin@travelease.test", Role.ROLE_ADMIN);
        Trip trip = trip(alice);
        when(tripRepository.findById(trip.getId())).thenReturn(Optional.of(trip));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(expenseParticipantRepository.findByExpenseTripId(trip.getId())).thenReturn(List.of());
        when(tripMemberRepository.findByTripId(trip.getId())).thenReturn(List.of());
        when(settlementRepository.findByTripId(trip.getId())).thenReturn(List.of());

        SettlementSummaryResponse response = settlementService.getTripSummary(trip.getId(), admin.getEmail());

        assertThat(response.tripId()).isEqualTo(trip.getId());
    }

    @Test
    void unrelatedTravelerCannotAccessTripSummary() {
        setUp();
        User alice = user("alice@travelease.test", Role.ROLE_TRAVELER);
        User eve = user("eve@travelease.test", Role.ROLE_TRAVELER);
        Trip trip = trip(alice);
        when(tripRepository.findById(trip.getId())).thenReturn(Optional.of(trip));
        when(userRepository.findByEmail(eve.getEmail())).thenReturn(Optional.of(eve));
        when(tripMemberRepository.existsByTripIdAndUserIdAndMemberStatus(trip.getId(), eve.getId(), TripMemberStatus.ACCEPTED))
                .thenReturn(false);

        assertThatThrownBy(() -> settlementService.getTripSummary(trip.getId(), eve.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void markPaidStillUsesParticipantIdentityNotTripMembership() {
        // Regression: confirms this Phase 4 centralization did not touch
        // markPaid's separate, narrower authorization rule.
        setUp();
        com.travelease.backend.settlement.entity.Settlement settlement = new com.travelease.backend.settlement.entity.Settlement();
        settlement.setId(UUID.randomUUID());
        User payer = user("payer@travelease.test", Role.ROLE_TRAVELER);
        User receiver = user("receiver@travelease.test", Role.ROLE_TRAVELER);
        settlement.setPayer(payer);
        settlement.setReceiver(receiver);
        settlement.setAmount(new BigDecimal("50.00"));
        settlement.setStatus(com.travelease.backend.settlement.entity.SettlementStatus.PENDING);
        when(settlementRepository.findById(settlement.getId())).thenReturn(Optional.of(settlement));
        when(settlementRepository.save(settlement)).thenReturn(settlement);

        // A third party who is neither payer nor receiver is denied, even
        // though no Trip-membership check is involved here at all.
        User stranger = user("stranger@travelease.test", Role.ROLE_TRAVELER);
        assertThatThrownBy(() -> settlementService.markPaid(settlement.getId(), stranger.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }
}
