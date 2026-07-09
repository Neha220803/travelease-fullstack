package com.travelease.backend.budget.service;

import com.travelease.backend.budget.dto.BudgetMemberSummaryResponse;
import com.travelease.backend.budget.dto.BudgetResponse;
import com.travelease.backend.budget.dto.BudgetSummaryResponse;
import com.travelease.backend.budget.mapper.BudgetMapper;
import com.travelease.backend.shared.exception.ResourceNotFoundException;
import com.travelease.backend.trip.entity.Trip;
import com.travelease.backend.trip.entity.TripMember;
import com.travelease.backend.trip.entity.TripMemberStatus;
import com.travelease.backend.trip.repository.TripMemberRepository;
import com.travelease.backend.trip.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BudgetServiceImpl implements BudgetService {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final BudgetMapper budgetMapper;

    @Override
    @Transactional(readOnly = true)
    public BudgetResponse getMyBudget(UUID tripId, String currentUserEmail) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip with id " + tripId + " not found"));
        TripMember member = tripMemberRepository
                .findByTripIdAndUserEmailAndMemberStatus(tripId, currentUserEmail, TripMemberStatus.ACCEPTED)
                .orElseThrow(() -> new AccessDeniedException("Current user is not a member of this trip"));

        List<TripMember> acceptedMembers = tripMemberRepository.findByTripIdAndMemberStatus(
                tripId,
                TripMemberStatus.ACCEPTED
        );
        BigDecimal memberBudget = member.getBudgetAmount();
        if (memberBudget == null || memberBudget.compareTo(BigDecimal.ZERO) == 0) {
            memberBudget = trip.getBudgetAmount().divide(BigDecimal.valueOf(acceptedMembers.size()), 2, RoundingMode.HALF_UP);
        }

        return budgetMapper.toResponse(
                tripId,
                member.getUser().getId(),
                memberBudget,
                member.getSpentAmount()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public BudgetSummaryResponse getTripSummary(UUID tripId, String currentUserEmail) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip with id " + tripId + " not found"));
        ensureCurrentUserIsMember(tripId, currentUserEmail);

        List<TripMember> acceptedMembers = tripMemberRepository.findByTripIdAndMemberStatus(
                tripId,
                TripMemberStatus.ACCEPTED
        );
        BigDecimal totalBudget = trip.getBudgetAmount();
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
                acceptedMembers.stream().map(member -> {
                    BigDecimal memberBudget = member.getBudgetAmount();
                    if (memberBudget == null || memberBudget.compareTo(BigDecimal.ZERO) == 0) {
                        memberBudget = totalBudget.divide(BigDecimal.valueOf(acceptedMembers.size()), 2, RoundingMode.HALF_UP);
                    }
                    BigDecimal memberRemaining = memberBudget.subtract(member.getSpentAmount());
                    return new BudgetMemberSummaryResponse(
                            member.getUser().getId(),
                            member.getUser().getName(),
                            memberBudget,
                            member.getSpentAmount(),
                            memberRemaining,
                            budgetMapper.utilization(memberBudget, member.getSpentAmount()),
                            memberRemaining.signum() < 0
                    );
                }).toList()
        );
    }

    private void ensureCurrentUserIsMember(UUID tripId, String email) {
        if (!tripMemberRepository.existsByTripIdAndUserEmailAndMemberStatus(tripId, email, TripMemberStatus.ACCEPTED)) {
            throw new AccessDeniedException("Current user is not a member of this trip");
        }
    }
}
