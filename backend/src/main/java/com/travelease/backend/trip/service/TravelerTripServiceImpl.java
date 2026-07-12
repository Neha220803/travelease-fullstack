package com.travelease.backend.trip.service;

import com.travelease.backend.auth.entity.Role;
import com.travelease.backend.auth.entity.User;
import com.travelease.backend.auth.repository.UserRepository;
import com.travelease.backend.itinerary.service.NotificationService;
import com.travelease.backend.shared.exception.InvalidRequestException;
import com.travelease.backend.shared.exception.ResourceNotFoundException;
import com.travelease.backend.trip.dto.AddTripMemberRequest;
import com.travelease.backend.trip.dto.CreateTripRequest;
import com.travelease.backend.trip.dto.PendingInvitationResponse;
import com.travelease.backend.trip.dto.TripMemberResponse;
import com.travelease.backend.trip.dto.TripResponse;
import com.travelease.backend.trip.dto.TripStatusTransitionRequest;
import com.travelease.backend.trip.dto.UpdateTripRequest;
import com.travelease.backend.trip.entity.Trip;
import com.travelease.backend.trip.entity.TravelerTripStatus;
import com.travelease.backend.trip.entity.TripMember;
import com.travelease.backend.trip.entity.TripMemberStatus;
import com.travelease.backend.trip.mapper.TravelerTripMapper;
import com.travelease.backend.trip.repository.TripMemberRepository;
import com.travelease.backend.trip.repository.TripRepository;
import com.travelease.backend.trip.security.TripAuthorizationService;
import com.travelease.backend.trips_and_invitations.repository.InvitationRepository;
import com.travelease.backend.expense.repository.ExpenseParticipantRepository;
import com.travelease.backend.expense.repository.ExpenseRepository;
import com.travelease.backend.settlement.repository.SettlementRepository;
import com.travelease.backend.itinerary.repository.ItineraryRepository;
import com.travelease.backend.itinerary.repository.DelayRepository;
import com.travelease.backend.itinerary.repository.ActivityBookingRepository;
import com.travelease.backend.accommodation.repository.HotelBookingRepository;
import com.travelease.backend.busbooking.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Named distinctly from busbooking.service.impl.TripServiceImpl (which serves
 * the unrelated BusBooking operational Trip) to avoid a Spring bean-name
 * collision and to keep the two Trip domains unambiguous.
 */
@Service
@RequiredArgsConstructor
public class TravelerTripServiceImpl implements TripService {

    private static final Logger log = LoggerFactory.getLogger(TravelerTripServiceImpl.class);


    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final UserRepository userRepository;
    private final TripAuthorizationService tripAuthorizationService;
    private final TravelerTripMapper tripMapper;
    private final NotificationService notificationService;
    private final InvitationRepository invitationRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseParticipantRepository expenseParticipantRepository;
    private final SettlementRepository settlementRepository;
    private final ItineraryRepository itineraryRepository;
    private final DelayRepository delayRepository;
    private final ActivityBookingRepository activityBookingRepository;
    private final HotelBookingRepository hotelBookingRepository;
    private final BookingRepository busBookingRepository;

    @Override
    @Transactional
    public TripResponse createTrip(CreateTripRequest request, String currentUserEmail) {
        requireValidDateRange(request.startDate(), request.endDate());
        if (request.startDate().isBefore(LocalDate.now())) {
            throw new InvalidRequestException("startDate must not be in the past");
        }
        User organizer = resolveCurrentUser(currentUserEmail);

        Trip trip = new Trip();
        trip.setTripName(request.tripName());
        trip.setOrganizer(organizer);
        trip.setSourceLocation(request.sourceLocation());
        trip.setDestinationId(request.destinationId());
        trip.setBudgetAmount(request.budgetAmount());
        trip.setCategoryId(request.categoryId());
        trip.setStartDate(request.startDate());
        trip.setEndDate(request.endDate());
        trip.setStatus(TravelerTripStatus.PLANNING);
        Trip saved = tripRepository.save(trip);

        // The organizer is also recorded as a TripMember (ACCEPTED) so that the
        // pre-existing Budget/Expense/Settlement membership checks -
        // existsByTripIdAndUserEmail - already recognize the organizer, exactly
        // like DemoDataInitializer's seed trip does.
        TripMember organizerMembership = new TripMember();
        organizerMembership.setTrip(saved);
        organizerMembership.setUser(organizer);
        organizerMembership.setMemberStatus(TripMemberStatus.ACCEPTED);
        organizerMembership.setJoinedDate(LocalDateTime.now());
        tripMemberRepository.save(organizerMembership);

        return tripMapper.toResponse(saved, "ORGANIZER");
    }

    @Override
    @Transactional(readOnly = true)
    public List<TripResponse> getMyTrips(String currentUserEmail) {
        User user = resolveCurrentUser(currentUserEmail);

        Map<UUID, Trip> tripsById = new LinkedHashMap<>();
        tripRepository.findByOrganizerId(user.getId()).forEach(trip -> tripsById.put(trip.getId(), trip));
        tripMemberRepository.findByUserIdAndMemberStatus(user.getId(), TripMemberStatus.ACCEPTED)
                .forEach(member -> tripsById.putIfAbsent(member.getTrip().getId(), member.getTrip()));

        return tripsById.values().stream()
                .map(trip -> tripMapper.toResponse(trip, viewerRole(trip, user.getId())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TripResponse getTripById(UUID tripId, String currentUserEmail) {
        Trip trip = findTrip(tripId);
        User user = resolveCurrentUser(currentUserEmail);
        tripAuthorizationService.requireMember(trip, user.getId(), isAdmin(user));
        return tripMapper.toResponse(trip, viewerRole(trip, user.getId()));
    }

    @Override
    @Transactional
    public TripResponse updateTrip(UUID tripId, UpdateTripRequest request, String currentUserEmail) {
        Trip trip = findTrip(tripId);
        User user = resolveCurrentUser(currentUserEmail);
        tripAuthorizationService.requireOrganizer(trip, user.getId(), isAdmin(user));
        tripAuthorizationService.requireMutableTrip(trip);
        requireValidDateRange(request.startDate(), request.endDate());
        if (trip.getStatus() == TravelerTripStatus.PLANNING
                && !request.startDate().equals(trip.getStartDate())
                && request.startDate().isBefore(LocalDate.now())) {
            throw new InvalidRequestException("startDate must not be in the past");
        }

        trip.setTripName(request.tripName());
        trip.setSourceLocation(request.sourceLocation());
        trip.setDestinationId(request.destinationId());
        trip.setBudgetAmount(request.budgetAmount());
        trip.setCategoryId(request.categoryId());
        trip.setStartDate(request.startDate());
        trip.setEndDate(request.endDate());
        Trip saved = tripRepository.save(trip);

        // Notify all accepted members except the organizer
        tripMemberRepository.findByTripId(tripId).stream()
                .filter(m -> m.getMemberStatus() == TripMemberStatus.ACCEPTED && !m.getUser().getId().equals(user.getId()))
                .forEach(m -> notificationService.createNotification(
                        m.getUser().getId().toString(),
                        "TRIP",
                        "Trip Updated",
                        "Trip details for " + trip.getTripName() + " have been updated by the organizer."
                ));

        return tripMapper.toResponse(saved, viewerRole(saved, user.getId()));
    }

    @Override
    @Transactional
    public void deleteTrip(UUID tripId, String currentUserEmail) {
        Trip trip = findTrip(tripId);
        User currentUser = resolveCurrentUser(currentUserEmail);
        tripAuthorizationService.requireOrganizer(trip, currentUser.getId(), isAdmin(currentUser));

        // Deliberately narrower than requireMutableTrip: a CANCELLED trip is
        // not "happening" but its record isn't historical fact the way a
        // COMPLETED trip's is, so the organizer can still remove it outright.
        // This also avoids the dead end where the delete dialog's own
        // "Cancel Trip Instead" fallback would otherwise leave the trip
        // permanently un-deletable afterwards.
        if (trip.getStatus() == TravelerTripStatus.COMPLETED) {
            throw new InvalidRequestException("Trip is COMPLETED and no longer accepts this action");
        }

        // Notify accepted members (other than the organizer) before the trip
        // and their membership rows are gone.
        tripMemberRepository.findByTripId(tripId).stream()
                .filter(m -> m.getMemberStatus() == TripMemberStatus.ACCEPTED && !m.getUser().getId().equals(currentUser.getId()))
                .forEach(m -> notificationService.createNotification(
                        m.getUser().getId().toString(),
                        "TRIP",
                        "Trip Cancelled",
                        "The trip " + trip.getTripName() + " has been deleted by the organizer."
                ));

        try {
            // Break foreign-key chains first so the hard delete does not fail
            // on SQLite / Hibernate flush order.
            activityBookingRepository.findByTripId(tripId).forEach(b -> b.setTripId(null));
            hotelBookingRepository.findByTripId(tripId).forEach(b -> b.setTripId(null));
            busBookingRepository.findByTravelerTripId(tripId).forEach(b -> b.setTravelerTripId(null));

            // Remove trip-owned records in child-first order.
            tripMemberRepository.deleteAllInBatch(tripMemberRepository.findByTripId(tripId));
            invitationRepository.deleteAllInBatch(invitationRepository.findByTripId(tripId));

            // deleteAllInBatch issues a direct bulk SQL DELETE and does NOT honor
            // JPA's cascade = ALL / orphanRemoval on Expense.participants, so the
            // expense_participants rows must be removed explicitly first or the
            // FK from expense_participants.expense_id -> expenses.expense_id
            // blocks the batch delete of expenses below (this was the cause of
            // the "unexpected error" on Delete Trip while Cancel Trip, which
            // never touches these tables, worked fine).
            expenseParticipantRepository.deleteAllInBatch(expenseParticipantRepository.findByExpenseTripId(tripId));
            expenseRepository.deleteAllInBatch(expenseRepository.findByTripIdOrderByCreatedAtDesc(tripId));
            settlementRepository.deleteAllInBatch(settlementRepository.findByTripId(tripId));

            String tripIdStr = tripId.toString();
            itineraryRepository.deleteAllInBatch(itineraryRepository.findByTripId(tripIdStr));
            delayRepository.deleteAllInBatch(delayRepository.findByTripId(tripIdStr));

            tripRepository.delete(trip);
            tripRepository.flush();
        } catch (RuntimeException ex) {
            // Widened from DataIntegrityViolationException-only: any failure
            // during this cleanup chain (FK violation, driver quirk, etc.)
            // should still land the user on the friendly "cancel instead"
            // path rather than the generic 500 message - but log the real
            // exception here since that's the one piece of information the
            // friendly client-facing message can't carry.
            log.error("Failed to delete trip {}", tripId, ex);
            throw new InvalidRequestException(
                    "This trip could not be fully deleted because of an unexpected data conflict. "
                            + "Please try again or contact support.");
        }
    }

    private static final Map<TravelerTripStatus, Set<TravelerTripStatus>> ALLOWED_TRANSITIONS = Map.of(
            TravelerTripStatus.PLANNING, Set.of(TravelerTripStatus.CONFIRMED, TravelerTripStatus.CANCELLED),
            TravelerTripStatus.CONFIRMED, Set.of(TravelerTripStatus.ONGOING, TravelerTripStatus.CANCELLED),
            TravelerTripStatus.ONGOING, Set.of(TravelerTripStatus.COMPLETED),
            TravelerTripStatus.COMPLETED, Set.of(),
            TravelerTripStatus.CANCELLED, Set.of()
    );

    @Override
    @Transactional
    public TripResponse transitionStatus(UUID tripId, TripStatusTransitionRequest request, String currentUserEmail) {
        Trip trip = findTrip(tripId);
        User user = resolveCurrentUser(currentUserEmail);
        tripAuthorizationService.requireOrganizer(trip, user.getId(), isAdmin(user));

        TravelerTripStatus current = trip.getStatus();
        TravelerTripStatus target = request.status();

        // Self-transitions are simply absent from every status's allowed-target
        // set, so X -> X is rejected the same way as any other invalid edge -
        // no separate idempotency special-case, matching a strict state-machine
        // reading rather than the attach/detach-style idempotency used elsewhere.
        if (!ALLOWED_TRANSITIONS.getOrDefault(current, Set.of()).contains(target)) {
            throw new InvalidRequestException("Cannot transition trip from " + current + " to " + target);
        }

        // The only date-aware guard in this model: a trip cannot be marked
        // ONGOING before its own start date arrives. No admin override - this is
        // a fact about the trip's dates, not a per-caller authorization decision.
        if (target == TravelerTripStatus.ONGOING && LocalDate.now().isBefore(trip.getStartDate())) {
            throw new InvalidRequestException("Trip cannot start before its start date " + trip.getStartDate());
        }

        trip.setStatus(target);
        Trip saved = tripRepository.save(trip);

        // Notify all accepted members except the organizer
        tripMemberRepository.findByTripId(tripId).stream()
                .filter(m -> m.getMemberStatus() == TripMemberStatus.ACCEPTED && !m.getUser().getId().equals(user.getId()))
                .forEach(m -> notificationService.createNotification(
                        m.getUser().getId().toString(),
                        "TRIP",
                        "Trip Status Changed",
                        "Trip " + trip.getTripName() + " status changed to " + target + "."
                ));

        return tripMapper.toResponse(saved, viewerRole(saved, user.getId()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TripMemberResponse> getTripMembers(UUID tripId, String currentUserEmail) {
        Trip trip = findTrip(tripId);
        User user = resolveCurrentUser(currentUserEmail);
        tripAuthorizationService.requireMember(trip, user.getId(), isAdmin(user));
        return tripMemberRepository.findByTripId(tripId).stream()
                .map(tripMapper::toMemberResponse)
                .toList();
    }

    @Override
    @Transactional
    public TripMemberResponse addTripMember(UUID tripId, AddTripMemberRequest request, String currentUserEmail) {
        Trip trip = findTrip(tripId);
        User currentUser = resolveCurrentUser(currentUserEmail);
        tripAuthorizationService.requireOrganizer(trip, currentUser.getId(), isAdmin(currentUser));
        tripAuthorizationService.requireMutableTrip(trip);

        User targetUser = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResourceNotFoundException("User with email " + request.email() + " not found"));

        if (targetUser.getRole() != Role.ROLE_TRAVELER) {
            throw new InvalidRequestException("Only travelers can be added as trip participants");
        }
        if (targetUser.getId().equals(trip.getOrganizer().getId())) {
            throw new InvalidRequestException("The organizer cannot invite themselves");
        }

        Optional<TripMember> existing = tripMemberRepository.findByTripIdAndUserId(tripId, targetUser.getId());
        TripMember member;
        if (existing.isPresent()) {
            member = existing.get();
            if (member.getMemberStatus() == TripMemberStatus.ACCEPTED) {
                throw new InvalidRequestException("User is already an active member of this trip");
            }
            if (member.getMemberStatus() == TripMemberStatus.INVITED) {
                throw new InvalidRequestException("User already has a pending invitation to this trip");
            }
            // REJECTED: re-invite by reusing the existing row (unique constraint on
            // trip_id+user_id forbids a second row). budgetAmount/spentAmount are left
            // untouched - a REJECTED row can only ever have come from an INVITED row
            // that was declined, and INVITED members are never eligible participants
            // in Expense's ACCEPTED-only checks, so those fields are always still the
            // BigDecimal.ZERO entity default here; there is no financial history to lose.
            member.setMemberStatus(TripMemberStatus.INVITED);
            member.setJoinedDate(null);
        } else {
            member = new TripMember();
            member.setTrip(trip);
            member.setUser(targetUser);
            member.setMemberStatus(TripMemberStatus.INVITED);
            member.setJoinedDate(null);
        }

        TripMember saved = tripMemberRepository.save(member);

        // Notify the invited user
        notificationService.createNotification(
                targetUser.getId().toString(),
                "TRIP",
                "Trip Invitation",
                "You have been invited to join the trip: " + trip.getTripName()
        );

        return tripMapper.toMemberResponse(saved);
    }

    @Override
    @Transactional
    public TripMemberResponse acceptTripMemberInvitation(UUID tripId, UUID tripMemberId, String currentUserEmail) {
        Trip trip = findTrip(tripId);
        User currentUser = resolveCurrentUser(currentUserEmail);
        TripMember member = tripMemberRepository.findByIdAndTripId(tripMemberId, tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip member with id " + tripMemberId + " not found"));

        if (!member.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Only the invited traveler can accept this invitation");
        }
        if (member.getMemberStatus() != TripMemberStatus.INVITED) {
            throw new InvalidRequestException("Only a pending invitation can be accepted");
        }
        // A pending invitation must not become an active member of a trip that
        // has already closed while the invite sat unanswered.
        tripAuthorizationService.requireMutableTrip(trip);

        member.setMemberStatus(TripMemberStatus.ACCEPTED);
        member.setJoinedDate(LocalDateTime.now());
        TripMember saved = tripMemberRepository.save(member);

        // Notify the organizer
        notificationService.createNotification(
                trip.getOrganizer().getId().toString(),
                "TRIP",
                "Invitation Accepted",
                currentUser.getName() + " has accepted your invitation to join " + trip.getTripName()
        );

        return tripMapper.toMemberResponse(saved);
    }

    @Override
    @Transactional
    public TripMemberResponse rejectTripMemberInvitation(UUID tripId, UUID tripMemberId, String currentUserEmail) {
        Trip trip = findTrip(tripId);
        User currentUser = resolveCurrentUser(currentUserEmail);
        TripMember member = tripMemberRepository.findByIdAndTripId(tripMemberId, tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip member with id " + tripMemberId + " not found"));

        if (!member.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Only the invited traveler can reject this invitation");
        }
        if (member.getMemberStatus() != TripMemberStatus.INVITED) {
            throw new InvalidRequestException("Only a pending invitation can be rejected");
        }
        tripAuthorizationService.requireMutableTrip(trip);

        member.setMemberStatus(TripMemberStatus.REJECTED);
        TripMember saved = tripMemberRepository.save(member);
        return tripMapper.toMemberResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PendingInvitationResponse> getMyPendingInvitations(String currentUserEmail) {
        User user = resolveCurrentUser(currentUserEmail);
        return tripMemberRepository.findByUserIdAndMemberStatus(user.getId(), TripMemberStatus.INVITED).stream()
                .map(tripMapper::toPendingInvitationResponse)
                .toList();
    }

    @Override
    @Transactional
    public void removeTripMember(UUID tripId, UUID tripMemberId, String currentUserEmail) {
        Trip trip = findTrip(tripId);
        User currentUser = resolveCurrentUser(currentUserEmail);
        tripAuthorizationService.requireOrganizer(trip, currentUser.getId(), isAdmin(currentUser));
        tripAuthorizationService.requireMutableTrip(trip);

        TripMember member = tripMemberRepository.findByIdAndTripId(tripMemberId, tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip member with id " + tripMemberId + " not found"));

        if (member.getUser().getId().equals(trip.getOrganizer().getId())) {
            throw new InvalidRequestException("The trip organizer cannot be removed from trip membership");
        }

        // One removal path for all three statuses: withdraws a pending invitation
        // (INVITED), removes an active participant (ACCEPTED), or clears stale
        // declined-invitation history (REJECTED) - organizer-only in every case.
        tripMemberRepository.delete(member);
    }

    private Trip findTrip(UUID tripId) {
        return tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip with id " + tripId + " not found"));
    }

    private User resolveCurrentUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    private boolean isAdmin(User user) {
        return user.getRole() == Role.ROLE_ADMIN;
    }

    private String viewerRole(Trip trip, UUID userId) {
        if (tripAuthorizationService.isOrganizer(trip, userId)) {
            return "ORGANIZER";
        }
        if (tripAuthorizationService.isMember(trip, userId)) {
            return "MEMBER";
        }
        return "ADMIN";
    }

    private void requireValidDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate.isAfter(endDate)) {
            throw new InvalidRequestException("startDate must not be after endDate");
        }
    }
}
