package com.travelease.backend.budget.service;

import com.travelease.backend.accommodation.repository.HotelBookingRepository;
import com.travelease.backend.auth.entity.Role;
import com.travelease.backend.auth.entity.User;
import com.travelease.backend.budget.dto.BudgetResponse;
import com.travelease.backend.budget.dto.BudgetSummaryResponse;
import com.travelease.backend.budget.mapper.BudgetMapper;
import com.travelease.backend.busbooking.repository.BookingRepository;
import com.travelease.backend.itinerary.repository.ActivityBookingRepository;
import com.travelease.backend.shared.exception.ResourceNotFoundException;
import com.travelease.backend.trip.entity.Trip;
import com.travelease.backend.trip.entity.TravelerTripStatus;
import com.travelease.backend.trip.entity.TripMember;
import com.travelease.backend.trip.entity.TripMemberStatus;
import com.travelease.backend.trip.repository.TripMemberRepository;
import com.travelease.backend.trip.repository.TripRepository;
import org.junit.jupiter.api.BeforeEach;
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
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BudgetServiceImplTest {

    @Mock
    private TripRepository tripRepository;
    @Mock
    private TripMemberRepository tripMemberRepository;
    @Mock
    private HotelBookingRepository hotelBookingRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private ActivityBookingRepository activityBookingRepository;

    private BudgetServiceImpl budgetService;

    @BeforeEach
    void setUp() {
        budgetService = new BudgetServiceImpl(
                tripRepository, tripMemberRepository, hotelBookingRepository,
                bookingRepository, activityBookingRepository, new BudgetMapper());
        // Only relevant to getTripSummary tests; getMyBudget tests never reach these calls.
        lenient().when(hotelBookingRepository.sumSpentByTripId(any())).thenReturn(BigDecimal.ZERO);
        lenient().when(bookingRepository.sumNetSpentByTravelerTripId(any())).thenReturn(0.0);
        lenient().when(activityBookingRepository.sumSpentByTripId(any())).thenReturn(BigDecimal.ZERO);
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

    private TripMember membership(Trip trip, User user, TripMemberStatus status) {
        TripMember member = new TripMember();
        member.setId(UUID.randomUUID());
        member.setTrip(trip);
        member.setUser(user);
        member.setMemberStatus(status);
        member.setBudgetAmount(new BigDecimal("500.00"));
        member.setSpentAmount(new BigDecimal("100.00"));
        return member;
    }

    @Test
    void invitedTravelerCannotAccessOwnBudget() {
        User alice = user("alice@travelease.test", Role.ROLE_TRAVELER);
        User bob = user("bob@travelease.test", Role.ROLE_TRAVELER);
        Trip trip = trip(alice);
        when(tripRepository.findById(trip.getId())).thenReturn(Optional.of(trip));
        // An INVITED row exists for bob, but the ACCEPTED-filtered lookup correctly
        // finds nothing for it.
        when(tripMemberRepository.findByTripIdAndUserEmailAndMemberStatus(
                trip.getId(), bob.getEmail(), TripMemberStatus.ACCEPTED)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> budgetService.getMyBudget(trip.getId(), bob.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void rejectedTravelerCannotAccessOwnBudget() {
        User alice = user("alice@travelease.test", Role.ROLE_TRAVELER);
        User cara = user("cara@travelease.test", Role.ROLE_TRAVELER);
        Trip trip = trip(alice);
        when(tripRepository.findById(trip.getId())).thenReturn(Optional.of(trip));
        when(tripMemberRepository.findByTripIdAndUserEmailAndMemberStatus(
                trip.getId(), cara.getEmail(), TripMemberStatus.ACCEPTED)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> budgetService.getMyBudget(trip.getId(), cara.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void acceptedTravelerCanAccessOwnBudget() {
        User alice = user("alice@travelease.test", Role.ROLE_TRAVELER);
        User bob = user("bob@travelease.test", Role.ROLE_TRAVELER);
        Trip trip = trip(alice);
        TripMember bobMembership = membership(trip, bob, TripMemberStatus.ACCEPTED);
        when(tripRepository.findById(trip.getId())).thenReturn(Optional.of(trip));
        when(tripMemberRepository.findByTripIdAndUserEmailAndMemberStatus(
                trip.getId(), bob.getEmail(), TripMemberStatus.ACCEPTED)).thenReturn(Optional.of(bobMembership));

        BudgetResponse response = budgetService.getMyBudget(trip.getId(), bob.getEmail());

        assertThat(response.userId()).isEqualTo(bob.getId());
        assertThat(response.budgetAmount()).isEqualByComparingTo("500.00");
        assertThat(response.spentAmount()).isEqualByComparingTo("100.00");
    }

    @Test
    void organizerCanAccessOwnBudgetViaTheirAcceptedOrganizerRow() {
        User alice = user("alice@travelease.test", Role.ROLE_TRAVELER);
        Trip trip = trip(alice);
        TripMember organizerMembership = membership(trip, alice, TripMemberStatus.ACCEPTED);
        when(tripRepository.findById(trip.getId())).thenReturn(Optional.of(trip));
        when(tripMemberRepository.findByTripIdAndUserEmailAndMemberStatus(
                trip.getId(), alice.getEmail(), TripMemberStatus.ACCEPTED)).thenReturn(Optional.of(organizerMembership));

        BudgetResponse response = budgetService.getMyBudget(trip.getId(), alice.getEmail());

        assertThat(response.userId()).isEqualTo(alice.getId());
    }

    @Test
    void unrelatedTravelerCannotAccessBudget() {
        User alice = user("alice@travelease.test", Role.ROLE_TRAVELER);
        User eve = user("eve@travelease.test", Role.ROLE_TRAVELER);
        Trip trip = trip(alice);
        when(tripRepository.findById(trip.getId())).thenReturn(Optional.of(trip));
        when(tripMemberRepository.findByTripIdAndUserEmailAndMemberStatus(
                trip.getId(), eve.getEmail(), TripMemberStatus.ACCEPTED)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> budgetService.getMyBudget(trip.getId(), eve.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void nonexistentTripReturnsNotFound() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.findById(tripId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> budgetService.getMyBudget(tripId, "anyone@travelease.test"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void tripSummaryIncludesHotelBusAndActivityBookingSpendNotJustLoggedExpenses() {
        User alice = user("alice@travelease.test", Role.ROLE_TRAVELER);
        Trip trip = trip(alice);
        trip.setBudgetAmount(new BigDecimal("50000.00"));
        TripMember aliceMembership = membership(trip, alice, TripMemberStatus.ACCEPTED);
        aliceMembership.setSpentAmount(new BigDecimal("2000.00")); // manually-logged shared expense
        when(tripRepository.findById(trip.getId())).thenReturn(Optional.of(trip));
        when(tripMemberRepository.existsByTripIdAndUserEmailAndMemberStatus(
                trip.getId(), alice.getEmail(), TripMemberStatus.ACCEPTED)).thenReturn(true);
        when(tripMemberRepository.findByTripIdAndMemberStatus(trip.getId(), TripMemberStatus.ACCEPTED))
                .thenReturn(List.of(aliceMembership));
        when(hotelBookingRepository.sumSpentByTripId(trip.getId())).thenReturn(new BigDecimal("20000.00"));
        when(bookingRepository.sumNetSpentByTravelerTripId(trip.getId())).thenReturn(5000.0);
        when(activityBookingRepository.sumSpentByTripId(trip.getId())).thenReturn(new BigDecimal("3000.00"));

        BudgetSummaryResponse response = budgetService.getTripSummary(trip.getId(), alice.getEmail());

        // 2000 (expenses) + 20000 (hotel) + 5000 (bus) + 3000 (activity) = 30000
        assertThat(response.totalSpent()).isEqualByComparingTo("30000.00");
        assertThat(response.remainingBudget()).isEqualByComparingTo("20000.00");
        assertThat(response.utilizationPercentage()).isEqualByComparingTo("60.00");
        assertThat(response.overspent()).isFalse();
    }

    @Test
    void tripSummaryNetsOutBusRefundsAndExcludesCancelledBookings() {
        User alice = user("alice@travelease.test", Role.ROLE_TRAVELER);
        Trip trip = trip(alice);
        trip.setBudgetAmount(new BigDecimal("10000.00"));
        TripMember aliceMembership = membership(trip, alice, TripMemberStatus.ACCEPTED);
        aliceMembership.setSpentAmount(BigDecimal.ZERO);
        when(tripRepository.findById(trip.getId())).thenReturn(Optional.of(trip));
        when(tripMemberRepository.existsByTripIdAndUserEmailAndMemberStatus(
                trip.getId(), alice.getEmail(), TripMemberStatus.ACCEPTED)).thenReturn(true);
        when(tripMemberRepository.findByTripIdAndMemberStatus(trip.getId(), TripMemberStatus.ACCEPTED))
                .thenReturn(List.of(aliceMembership));
        // Net bus spend after a partial refund; the repository query is responsible for
        // subtracting totalRefundAmount and excluding cancelled bookings entirely - this
        // test just verifies the service trusts and forwards that net figure.
        when(bookingRepository.sumNetSpentByTravelerTripId(trip.getId())).thenReturn(1500.0);

        BudgetSummaryResponse response = budgetService.getTripSummary(trip.getId(), alice.getEmail());

        assertThat(response.totalSpent()).isEqualByComparingTo("1500.00");
    }
}
