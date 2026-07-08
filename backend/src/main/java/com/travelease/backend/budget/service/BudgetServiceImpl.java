package com.travelease.backend.budget.service;

import com.travelease.backend.auth.entity.Role;
import com.travelease.backend.auth.entity.User;
import com.travelease.backend.auth.repository.UserRepository;
import com.travelease.backend.budget.dto.BudgetResponse;
import com.travelease.backend.budget.dto.BudgetSummaryResponse;
import com.travelease.backend.budget.mapper.BudgetMapper;
import com.travelease.backend.shared.exception.ResourceNotFoundException;
import com.travelease.backend.trip.entity.Trip;
import com.travelease.backend.trip.entity.TripMember;
import com.travelease.backend.trip.entity.TripMemberStatus;
import com.travelease.backend.trip.repository.TripMemberRepository;
import com.travelease.backend.trip.repository.TripRepository;
import com.travelease.backend.trip.security.TripAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BudgetServiceImpl implements BudgetService {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final UserRepository userRepository;
    private final TripAuthorizationService tripAuthorizationService;
    private final BudgetMapper budgetMapper;

    @Override
    @Transactional(readOnly = true)
    public BudgetResponse getMyBudget(UUID tripId, String currentUserEmail) {
        ensureTripExists(tripId);
        TripMember member = tripMemberRepository
                .findByTripIdAndUserEmailAndMemberStatus(tripId, currentUserEmail, TripMemberStatus.ACCEPTED)
                .orElseThrow(() -> new AccessDeniedException("Current user is not a member of this trip"));

        return budgetMapper.toResponse(
                tripId,
                member.getUser().getId(),
                member.getBudgetAmount(),
                member.getSpentAmount()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public BudgetSummaryResponse getTripSummary(UUID tripId, String currentUserEmail) {
        Trip trip = findTrip(tripId);
        // Unlike getMyBudget (a self-referential "my own row" lookup where an
        // admin bypass wouldn't have a row to return), this is a generic
        // trip-wide aggregate view, so it is centralized onto
        // TripAuthorizationService for the same Organizer/ACCEPTED-member-or-
        // ADMIN semantics used by Itinerary and the Trip-attachment endpoints.
        User currentUser = resolveCurrentUser(currentUserEmail);
        tripAuthorizationService.requireMember(trip, currentUser.getId(), isAdmin(currentUser));

        List<TripMember> acceptedMembers = tripMemberRepository.findByTripIdAndMemberStatus(
                tripId,
                TripMemberStatus.ACCEPTED
        );
        BigDecimal totalBudget = acceptedMembers.stream()
                .map(TripMember::getBudgetAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalSpent = acceptedMembers.stream()
                .map(TripMember::getSpentAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal remaining = totalBudget.subtract(totalSpent);

        return new BudgetSummaryResponse(
                tripId,
                totalBudget,
                totalSpent,
                remaining,
                budgetMapper.utilization(totalBudget, totalSpent),
                remaining.signum() < 0,
                acceptedMembers.stream().map(budgetMapper::toMemberSummary).toList()
        );
    }

    private void ensureTripExists(UUID tripId) {
        if (!tripRepository.existsById(tripId)) {
            throw new ResourceNotFoundException("Trip with id " + tripId + " not found");
        }
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
}
