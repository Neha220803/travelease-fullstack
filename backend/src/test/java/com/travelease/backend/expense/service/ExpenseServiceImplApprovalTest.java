package com.travelease.backend.expense.service;

import com.travelease.backend.auth.entity.Role;
import com.travelease.backend.auth.entity.User;
import com.travelease.backend.auth.repository.UserRepository;
import com.travelease.backend.expense.dto.CreateExpenseRequest;
import com.travelease.backend.expense.dto.ExpenseResponse;
import com.travelease.backend.expense.entity.Expense;
import com.travelease.backend.expense.entity.ExpenseParticipant;
import com.travelease.backend.expense.entity.ExpenseParticipantStatus;
import com.travelease.backend.expense.entity.ExpenseStatus;
import com.travelease.backend.expense.mapper.ExpenseMapper;
import com.travelease.backend.expense.repository.ExpenseRepository;
import com.travelease.backend.itinerary.service.NotificationService;
import com.travelease.backend.shared.exception.InvalidRequestException;
import com.travelease.backend.trip.entity.Trip;
import com.travelease.backend.trip.entity.TravelerTripStatus;
import com.travelease.backend.trip.entity.TripMember;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExpenseServiceImplApprovalTest {

    @Mock
    private ExpenseRepository expenseRepository;
    @Mock
    private TripRepository tripRepository;
    @Mock
    private TripMemberRepository tripMemberRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationService notificationService;

    private final ExpenseMapper expenseMapper = new ExpenseMapper();

    private ExpenseServiceImpl newService() {
        TripAuthorizationService realAuth = new TripAuthorizationService(tripMemberRepository);
        return new ExpenseServiceImpl(
                expenseRepository, tripRepository, tripMemberRepository, userRepository, expenseMapper, realAuth, notificationService);
    }

    private User user(String email) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setName(email);
        user.setRole(Role.ROLE_TRAVELER);
        return user;
    }

    private Trip trip(User organizer) {
        Trip trip = new Trip();
        trip.setId(UUID.randomUUID());
        trip.setTripName("Goa Trip");
        trip.setOrganizer(organizer);
        trip.setSourceLocation("Mumbai");
        trip.setDestinationId(1);
        trip.setBudgetAmount(new BigDecimal("10000.00"));
        trip.setCategoryId(1);
        trip.setStartDate(LocalDate.now().minusDays(1));
        trip.setEndDate(LocalDate.now().plusDays(5));
        trip.setStatus(TravelerTripStatus.PLANNING);
        return trip;
    }

    private TripMember membership(Trip trip, User user) {
        TripMember member = new TripMember();
        member.setId(UUID.randomUUID());
        member.setTrip(trip);
        member.setUser(user);
        member.setMemberStatus(TripMemberStatus.ACCEPTED);
        member.setBudgetAmount(new BigDecimal("500.00"));
        member.setSpentAmount(BigDecimal.ZERO);
        return member;
    }

    private void stubSaveEcho() {
        when(expenseRepository.save(any(Expense.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(tripMemberRepository.save(any(TripMember.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void createSharedExpenseRejectsSinglePersonTrip() {
        ExpenseServiceImpl service = newService();
        User alice = user("alice@travelease.test");
        Trip trip = trip(alice);
        TripMember aliceMembership = membership(trip, alice);
        when(tripRepository.findById(trip.getId())).thenReturn(Optional.of(trip));
        when(tripMemberRepository.existsByTripIdAndUserEmailAndMemberStatus(
                trip.getId(), alice.getEmail(), TripMemberStatus.ACCEPTED)).thenReturn(true);
        when(userRepository.findByEmail(alice.getEmail())).thenReturn(Optional.of(alice));
        when(tripMemberRepository.findByTripIdAndMemberStatus(trip.getId(), TripMemberStatus.ACCEPTED))
                .thenReturn(List.of(aliceMembership));

        CreateExpenseRequest request = new CreateExpenseRequest(
                new BigDecimal("100.00"), "Food", "Dinner", LocalDate.now(),
                alice.getId(), List.of(alice.getId(), UUID.randomUUID()), null);

        assertThatThrownBy(() -> service.createSharedExpense(trip.getId(), request, alice.getEmail()))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("only one member");
    }

    @Test
    void createSharedExpenseAutoApprovesCreatorAndLeavesOtherParticipantPending() {
        ExpenseServiceImpl service = newService();
        stubSaveEcho();
        User alice = user("alice@travelease.test");
        User bob = user("bob@travelease.test");
        Trip trip = trip(alice);
        TripMember aliceMembership = membership(trip, alice);
        TripMember bobMembership = membership(trip, bob);
        when(tripRepository.findById(trip.getId())).thenReturn(Optional.of(trip));
        when(tripMemberRepository.existsByTripIdAndUserEmailAndMemberStatus(
                trip.getId(), alice.getEmail(), TripMemberStatus.ACCEPTED)).thenReturn(true);
        when(tripMemberRepository.findByTripIdAndMemberStatus(trip.getId(), TripMemberStatus.ACCEPTED))
                .thenReturn(List.of(aliceMembership, bobMembership));
        when(tripMemberRepository.existsByTripIdAndUserIdAndMemberStatus(trip.getId(), alice.getId(), TripMemberStatus.ACCEPTED))
                .thenReturn(true);
        when(tripMemberRepository.findByTripIdAndUserIdInAndMemberStatus(eq(trip.getId()), any(), any()))
                .thenReturn(List.of(aliceMembership, bobMembership));
        when(userRepository.findById(alice.getId())).thenReturn(Optional.of(alice));
        when(userRepository.findByEmail(alice.getEmail())).thenReturn(Optional.of(alice));

        CreateExpenseRequest request = new CreateExpenseRequest(
                new BigDecimal("100.00"), "Food", "Dinner", LocalDate.now(),
                alice.getId(), List.of(alice.getId(), bob.getId()), null);

        ExpenseResponse response = service.createSharedExpense(trip.getId(), request, alice.getEmail());

        assertThat(response.status()).isEqualTo(ExpenseStatus.PENDING);
        var aliceParticipant = response.participants().stream().filter(p -> p.userId().equals(alice.getId())).findFirst().orElseThrow();
        var bobParticipant = response.participants().stream().filter(p -> p.userId().equals(bob.getId())).findFirst().orElseThrow();
        assertThat(aliceParticipant.status()).isEqualTo(ExpenseParticipantStatus.APPROVED);
        assertThat(bobParticipant.status()).isEqualTo(ExpenseParticipantStatus.PENDING);
        // Not finalized yet - no charge applied to either member.
        assertThat(aliceMembership.getSpentAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(bobMembership.getSpentAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void createSharedExpenseRejectsSingleParticipant() {
        ExpenseServiceImpl service = newService();
        User alice = user("alice@travelease.test");
        Trip trip = trip(alice);
        TripMember aliceMembership = membership(trip, alice);
        when(tripRepository.findById(trip.getId())).thenReturn(Optional.of(trip));
        when(tripMemberRepository.existsByTripIdAndUserEmailAndMemberStatus(
                trip.getId(), alice.getEmail(), TripMemberStatus.ACCEPTED)).thenReturn(true);
        when(userRepository.findByEmail(alice.getEmail())).thenReturn(Optional.of(alice));

        CreateExpenseRequest request = new CreateExpenseRequest(
                new BigDecimal("50.00"), "Food", "Solo snack", LocalDate.now(),
                alice.getId(), List.of(alice.getId()), null);

        assertThatThrownBy(() -> service.createSharedExpense(trip.getId(), request, alice.getEmail()))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("At least two participants are required");
    }

    @Test
    void approveExpenseFinalizesAndAppliesChargesOnceEveryoneApproved() {
        ExpenseServiceImpl service = newService();
        User alice = user("alice@travelease.test");
        User bob = user("bob@travelease.test");
        Trip trip = trip(alice);
        TripMember aliceMembership = membership(trip, alice);
        TripMember bobMembership = membership(trip, bob);

        Expense expense = new Expense();
        expense.setId(UUID.randomUUID());
        expense.setTrip(trip);
        expense.setPayer(alice);
        expense.setAmount(new BigDecimal("100.00"));
        expense.setCategory("Food");
        expense.setDescription("Dinner");
        expense.setExpenseDate(LocalDate.now());
        expense.setStatus(ExpenseStatus.PENDING);

        ExpenseParticipant aliceParticipant = new ExpenseParticipant();
        aliceParticipant.setExpense(expense);
        aliceParticipant.setUser(alice);
        aliceParticipant.setShareAmount(new BigDecimal("50.00"));
        aliceParticipant.setStatus(ExpenseParticipantStatus.APPROVED);

        ExpenseParticipant bobParticipant = new ExpenseParticipant();
        bobParticipant.setExpense(expense);
        bobParticipant.setUser(bob);
        bobParticipant.setShareAmount(new BigDecimal("50.00"));
        bobParticipant.setStatus(ExpenseParticipantStatus.PENDING);

        expense.getParticipants().add(aliceParticipant);
        expense.getParticipants().add(bobParticipant);

        when(expenseRepository.findByIdAndTripId(expense.getId(), trip.getId())).thenReturn(Optional.of(expense));
        when(tripRepository.findById(trip.getId())).thenReturn(Optional.of(trip));
        when(tripMemberRepository.existsByTripIdAndUserEmailAndMemberStatus(
                trip.getId(), bob.getEmail(), TripMemberStatus.ACCEPTED)).thenReturn(true);
        when(userRepository.findByEmail(bob.getEmail())).thenReturn(Optional.of(bob));
        when(tripMemberRepository.findByTripIdAndUserIdInAndMemberStatus(eq(trip.getId()), any(), any()))
                .thenReturn(List.of(aliceMembership, bobMembership));
        when(expenseRepository.save(any(Expense.class))).thenAnswer(inv -> inv.getArgument(0));
        when(tripMemberRepository.save(any(TripMember.class))).thenAnswer(inv -> inv.getArgument(0));

        ExpenseResponse response = service.approveExpense(trip.getId(), expense.getId(), bob.getEmail());

        assertThat(response.status()).isEqualTo(ExpenseStatus.FINALIZED);
        assertThat(aliceMembership.getSpentAmount()).isEqualByComparingTo("50.00");
        assertThat(bobMembership.getSpentAmount()).isEqualByComparingTo("50.00");
    }

    @Test
    void approveExpenseStaysPendingWhileOtherParticipantsHaveNotApproved() {
        ExpenseServiceImpl service = newService();
        User alice = user("alice@travelease.test");
        User bob = user("bob@travelease.test");
        User cara = user("cara@travelease.test");
        Trip trip = trip(alice);

        Expense expense = new Expense();
        expense.setId(UUID.randomUUID());
        expense.setTrip(trip);
        expense.setPayer(alice);
        expense.setAmount(new BigDecimal("90.00"));
        expense.setCategory("Food");
        expense.setDescription("Dinner");
        expense.setExpenseDate(LocalDate.now());
        expense.setStatus(ExpenseStatus.PENDING);

        ExpenseParticipant aliceParticipant = new ExpenseParticipant();
        aliceParticipant.setExpense(expense);
        aliceParticipant.setUser(alice);
        aliceParticipant.setShareAmount(new BigDecimal("30.00"));
        aliceParticipant.setStatus(ExpenseParticipantStatus.APPROVED);

        ExpenseParticipant bobParticipant = new ExpenseParticipant();
        bobParticipant.setExpense(expense);
        bobParticipant.setUser(bob);
        bobParticipant.setShareAmount(new BigDecimal("30.00"));
        bobParticipant.setStatus(ExpenseParticipantStatus.PENDING);

        ExpenseParticipant caraParticipant = new ExpenseParticipant();
        caraParticipant.setExpense(expense);
        caraParticipant.setUser(cara);
        caraParticipant.setShareAmount(new BigDecimal("30.00"));
        caraParticipant.setStatus(ExpenseParticipantStatus.PENDING);

        expense.getParticipants().add(aliceParticipant);
        expense.getParticipants().add(bobParticipant);
        expense.getParticipants().add(caraParticipant);

        when(expenseRepository.findByIdAndTripId(expense.getId(), trip.getId())).thenReturn(Optional.of(expense));
        when(tripRepository.findById(trip.getId())).thenReturn(Optional.of(trip));
        when(tripMemberRepository.existsByTripIdAndUserEmailAndMemberStatus(
                trip.getId(), bob.getEmail(), TripMemberStatus.ACCEPTED)).thenReturn(true);
        when(userRepository.findByEmail(bob.getEmail())).thenReturn(Optional.of(bob));
        when(expenseRepository.save(any(Expense.class))).thenAnswer(inv -> inv.getArgument(0));

        ExpenseResponse response = service.approveExpense(trip.getId(), expense.getId(), bob.getEmail());

        assertThat(response.status()).isEqualTo(ExpenseStatus.PENDING);
    }

    @Test
    void rejectExpenseMarksRejectedAndAppliesNoCharges() {
        ExpenseServiceImpl service = newService();
        User alice = user("alice@travelease.test");
        User bob = user("bob@travelease.test");
        Trip trip = trip(alice);

        Expense expense = new Expense();
        expense.setId(UUID.randomUUID());
        expense.setTrip(trip);
        expense.setPayer(alice);
        expense.setAmount(new BigDecimal("100.00"));
        expense.setCategory("Food");
        expense.setDescription("Dinner");
        expense.setExpenseDate(LocalDate.now());
        expense.setStatus(ExpenseStatus.PENDING);

        ExpenseParticipant aliceParticipant = new ExpenseParticipant();
        aliceParticipant.setExpense(expense);
        aliceParticipant.setUser(alice);
        aliceParticipant.setShareAmount(new BigDecimal("50.00"));
        aliceParticipant.setStatus(ExpenseParticipantStatus.APPROVED);

        ExpenseParticipant bobParticipant = new ExpenseParticipant();
        bobParticipant.setExpense(expense);
        bobParticipant.setUser(bob);
        bobParticipant.setShareAmount(new BigDecimal("50.00"));
        bobParticipant.setStatus(ExpenseParticipantStatus.PENDING);

        expense.getParticipants().add(aliceParticipant);
        expense.getParticipants().add(bobParticipant);

        when(expenseRepository.findByIdAndTripId(expense.getId(), trip.getId())).thenReturn(Optional.of(expense));
        when(tripRepository.findById(trip.getId())).thenReturn(Optional.of(trip));
        when(tripMemberRepository.existsByTripIdAndUserEmailAndMemberStatus(
                trip.getId(), bob.getEmail(), TripMemberStatus.ACCEPTED)).thenReturn(true);
        when(userRepository.findByEmail(bob.getEmail())).thenReturn(Optional.of(bob));
        when(expenseRepository.save(any(Expense.class))).thenAnswer(inv -> inv.getArgument(0));

        ExpenseResponse response = service.rejectExpense(trip.getId(), expense.getId(), bob.getEmail());

        assertThat(response.status()).isEqualTo(ExpenseStatus.REJECTED);
    }

    @Test
    void approveExpenseRejectsWhenCallerIsNotAParticipant() {
        ExpenseServiceImpl service = newService();
        User alice = user("alice@travelease.test");
        User eve = user("eve@travelease.test");
        Trip trip = trip(alice);

        Expense expense = new Expense();
        expense.setId(UUID.randomUUID());
        expense.setTrip(trip);
        expense.setPayer(alice);
        expense.setAmount(new BigDecimal("100.00"));
        expense.setCategory("Food");
        expense.setDescription("Dinner");
        expense.setExpenseDate(LocalDate.now());
        expense.setStatus(ExpenseStatus.PENDING);

        ExpenseParticipant aliceParticipant = new ExpenseParticipant();
        aliceParticipant.setExpense(expense);
        aliceParticipant.setUser(alice);
        aliceParticipant.setShareAmount(new BigDecimal("100.00"));
        aliceParticipant.setStatus(ExpenseParticipantStatus.APPROVED);
        expense.getParticipants().add(aliceParticipant);

        when(expenseRepository.findByIdAndTripId(expense.getId(), trip.getId())).thenReturn(Optional.of(expense));
        when(tripRepository.findById(trip.getId())).thenReturn(Optional.of(trip));
        when(tripMemberRepository.existsByTripIdAndUserEmailAndMemberStatus(
                trip.getId(), eve.getEmail(), TripMemberStatus.ACCEPTED)).thenReturn(true);
        when(userRepository.findByEmail(eve.getEmail())).thenReturn(Optional.of(eve));

        assertThatThrownBy(() -> service.approveExpense(trip.getId(), expense.getId(), eve.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void approveExpenseRejectsWhenExpenseAlreadyFinalized() {
        ExpenseServiceImpl service = newService();
        User alice = user("alice@travelease.test");
        Trip trip = trip(alice);

        Expense expense = new Expense();
        expense.setId(UUID.randomUUID());
        expense.setTrip(trip);
        expense.setPayer(alice);
        expense.setAmount(new BigDecimal("100.00"));
        expense.setCategory("Food");
        expense.setDescription("Dinner");
        expense.setExpenseDate(LocalDate.now());
        expense.setStatus(ExpenseStatus.FINALIZED);

        ExpenseParticipant aliceParticipant = new ExpenseParticipant();
        aliceParticipant.setExpense(expense);
        aliceParticipant.setUser(alice);
        aliceParticipant.setShareAmount(new BigDecimal("100.00"));
        aliceParticipant.setStatus(ExpenseParticipantStatus.APPROVED);
        expense.getParticipants().add(aliceParticipant);

        when(expenseRepository.findByIdAndTripId(expense.getId(), trip.getId())).thenReturn(Optional.of(expense));
        when(tripRepository.findById(trip.getId())).thenReturn(Optional.of(trip));
        when(tripMemberRepository.existsByTripIdAndUserEmailAndMemberStatus(
                trip.getId(), alice.getEmail(), TripMemberStatus.ACCEPTED)).thenReturn(true);

        assertThatThrownBy(() -> service.approveExpense(trip.getId(), expense.getId(), alice.getEmail()))
                .isInstanceOf(InvalidRequestException.class);
    }
}
