package com.travelease.backend.busbooking.service.impl;

import com.travelease.backend.auth.entity.User;
import com.travelease.backend.auth.repository.UserRepository;
import com.travelease.backend.busbooking.dto.response.RefundResponse;
import com.travelease.backend.busbooking.entity.Booking;
import com.travelease.backend.busbooking.entity.Refund;
import com.travelease.backend.busbooking.entity.enums.RefundStatus;
import com.travelease.backend.busbooking.mapper.RefundMapper;
import com.travelease.backend.busbooking.repository.BookingRepository;
import com.travelease.backend.busbooking.repository.BookingTimelineRepository;
import com.travelease.backend.busbooking.repository.RefundRepository;
import com.travelease.backend.busbooking.security.SecurityUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Phase 4 fix: RefundServiceImpl.getRefundById previously performed no
 * ownership check of its own, relying entirely on RefundController's
 * follow-up bookingService.getBookingById(...) side-effect call. These tests
 * exercise the service method directly (bypassing that controller-side call)
 * to prove the enforcement now lives inside the service itself too.
 */
@ExtendWith(MockitoExtension.class)
class RefundServiceImplOwnershipTest {

    @Mock
    private RefundRepository refundRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private BookingTimelineRepository timelineRepository;
    @Mock
    private UserRepository userRepository;

    private RefundServiceImpl refundService;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void setUp() {
        SecurityUtil securityUtil = new SecurityUtil(userRepository);
        refundService = new RefundServiceImpl(
                refundRepository, bookingRepository, timelineRepository, new RefundMapper(), securityUtil);
    }

    private void authenticateAs(String email, String role) {
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(role));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(email, null, authorities));
    }

    private User traveler(String email) {
        User user = new User();
        user.setEmail(email);
        return user;
    }

    private Refund refundOwnedBy(UUID ownerUserId) {
        Booking booking = Booking.builder()
                .id(1L)
                .userId(ownerUserId)
                .bookingReference("BK-1")
                .build();
        Refund refund = new Refund();
        refund.setId(10L);
        refund.setBooking(booking);
        refund.setRefundReference("RF-1");
        refund.setOriginalAmount(500.0);
        refund.setNetRefundable(450.0);
        refund.setStatus(RefundStatus.INITIATED);
        return refund;
    }

    @Test
    void ownerCanReadOwnRefund() {
        setUp();
        User owner = traveler("owner@travelease.test");
        UUID ownerId = UUID.randomUUID();
        setUserId(owner, ownerId);
        when(userRepository.findByEmail(owner.getEmail())).thenReturn(Optional.of(owner));
        authenticateAs(owner.getEmail(), "ROLE_TRAVELER");

        Refund refund = refundOwnedBy(ownerId);
        when(refundRepository.findById(10L)).thenReturn(Optional.of(refund));

        RefundResponse response = refundService.getRefundById(10L);

        assertThat(response.getId()).isEqualTo(10L);
    }

    @Test
    void nonOwnerCannotReadAnotherTravelersRefund() {
        setUp();
        User intruder = traveler("intruder@travelease.test");
        UUID intruderId = UUID.randomUUID();
        setUserId(intruder, intruderId);
        when(userRepository.findByEmail(intruder.getEmail())).thenReturn(Optional.of(intruder));
        authenticateAs(intruder.getEmail(), "ROLE_TRAVELER");

        UUID ownerId = UUID.randomUUID();
        Refund refund = refundOwnedBy(ownerId);
        when(refundRepository.findById(10L)).thenReturn(Optional.of(refund));

        assertThatThrownBy(() -> refundService.getRefundById(10L))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void adminCanReadAnyRefund() {
        setUp();
        authenticateAs("admin@travelease.test", "ROLE_ADMIN");

        UUID ownerId = UUID.randomUUID();
        Refund refund = refundOwnedBy(ownerId);
        when(refundRepository.findById(10L)).thenReturn(Optional.of(refund));

        RefundResponse response = refundService.getRefundById(10L);

        assertThat(response.getId()).isEqualTo(10L);
    }

    private void setUserId(User user, UUID id) {
        try {
            var field = com.travelease.backend.shared.entity.BaseEntity.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, id);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
