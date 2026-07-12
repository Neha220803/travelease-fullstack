package com.travelease.backend.auth.service;

import com.travelease.backend.auth.dto.PartnerRegisterRequest;
import com.travelease.backend.auth.dto.PendingPartnerResponse;
import com.travelease.backend.auth.dto.RegisterRequest;
import com.travelease.backend.auth.dto.UserResponse;
import com.travelease.backend.auth.entity.ApprovalStatus;
import com.travelease.backend.auth.entity.Provider;
import com.travelease.backend.auth.entity.Role;
import com.travelease.backend.auth.entity.User;
import com.travelease.backend.auth.repository.ProviderRepository;
import com.travelease.backend.auth.repository.UserRepository;
import com.travelease.backend.shared.exception.DuplicateResourceException;
import com.travelease.backend.shared.exception.InvalidRequestException;
import com.travelease.backend.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.mockito.ArgumentCaptor;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProviderRepository providerRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserServiceImpl userService;

    @Test
    void registerSavesNewUserWithHashedPasswordAndTravelerRole() {
        RegisterRequest request = new RegisterRequest(
                "Asha",
                "asha@example.com",
                "9999999999",
                "Passw0rd1",
                "What is the name of the hospital where you were born?",
                "City General"
        );
        when(userRepository.existsByEmail("asha@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Passw0rd1")).thenReturn("hashed-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setId(UUID.fromString("11111111-1111-1111-1111-111111111111"));
            return saved;
        });

        UserResponse response = userService.register(request);

        assertThat(response.id()).isEqualTo(UUID.fromString("11111111-1111-1111-1111-111111111111"));
        assertThat(response.name()).isEqualTo("Asha");
        assertThat(response.email()).isEqualTo("asha@example.com");
        assertThat(response.role()).isEqualTo(Role.ROLE_TRAVELER.name());
    }

    @Test
    void registerDefaultsToApprovedStatus() {
        RegisterRequest request = new RegisterRequest(
                "Asha",
                "asha@example.com",
                "9999999999",
                "Passw0rd1",
                "What is the name of the hospital where you were born?",
                "City General"
        );
        when(userRepository.existsByEmail("asha@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        userService.register(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(ApprovalStatus.APPROVED);
    }

    @Test
    void registerStoresSecurityQuestionAndHashedAnswerForTravelers() {
        RegisterRequest request = new RegisterRequest(
                "Asha",
                "asha@example.com",
                "9999999999",
                "Passw0rd1",
                "What is the name of the hospital where you were born?",
                "City General"
        );
        when(userRepository.existsByEmail("asha@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Passw0rd1")).thenReturn("hashed-password");
        when(passwordEncoder.encode("City General")).thenReturn("hashed-answer");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        userService.register(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User savedUser = captor.getValue();

        assertThat(savedUser.getRole()).isEqualTo(Role.ROLE_TRAVELER);
        assertThat(savedUser.getSecurityQuestion()).isEqualTo("What is the name of the hospital where you were born?");
        assertThat(savedUser.getSecurityAnswerHash()).isEqualTo("hashed-answer");
    }

    @Test
    void registerRejectsDuplicateEmail() {
        RegisterRequest request = new RegisterRequest(
                "Asha",
                "asha@example.com",
                "9999999999",
                "Passw0rd1",
                "What is the name of the hospital where you were born?",
                "City General"
        );
        when(userRepository.existsByEmail("asha@example.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.register(request))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void registerPartnerCreatesPendingProviderAccount() {
        PartnerRegisterRequest request = new PartnerRegisterRequest(
                "Priya", "priya@example.com", "9999999999", "Passw0rd1", "HOTEL_PROVIDER",
                "What is the name of the hospital where you were born?", "City General");
        when(userRepository.existsByEmail("priya@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserResponse response = userService.registerPartner(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(ApprovalStatus.PENDING);
        assertThat(captor.getValue().getRole()).isEqualTo(Role.ROLE_HOTEL_PROVIDER);
        assertThat(response.role()).isEqualTo(Role.ROLE_HOTEL_PROVIDER.name());
    }

    @Test
    void registerPartnerRejectsNonProviderRole() {
        PartnerRegisterRequest request = new PartnerRegisterRequest(
                "Priya", "priya@example.com", "9999999999", "Passw0rd1", "TRAVELER",
                "What is the name of the hospital where you were born?", "City General");
        when(userRepository.existsByEmail("priya@example.com")).thenReturn(false);

        assertThatThrownBy(() -> userService.registerPartner(request))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void registerPartnerRejectsDuplicateEmail() {
        PartnerRegisterRequest request = new PartnerRegisterRequest(
                "Priya", "priya@example.com", "9999999999", "Passw0rd1", "HOTEL_PROVIDER",
                "What is the name of the hospital where you were born?", "City General");
        when(userRepository.existsByEmail("priya@example.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.registerPartner(request))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void registerRejectsUnknownSecurityQuestion() {
        RegisterRequest request = new RegisterRequest(
                "Asha",
                "asha-unknown-question@example.com",
                "9999999999",
                "Passw0rd1",
                "What is your favorite color?",
                "Blue"
        );
        when(userRepository.existsByEmail("asha-unknown-question@example.com")).thenReturn(false);

        assertThatThrownBy(() -> userService.register(request))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void registerPartnerRejectsUnknownSecurityQuestion() {
        PartnerRegisterRequest request = new PartnerRegisterRequest(
                "Priya", "priya-unknown-question@example.com", "9999999999", "Passw0rd1", "HOTEL_PROVIDER",
                "What is your favorite color?", "Blue");
        when(userRepository.existsByEmail("priya-unknown-question@example.com")).thenReturn(false);

        assertThatThrownBy(() -> userService.registerPartner(request))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void listPendingPartnersReturnsOnlyPendingProviderAccounts() {
        User hotelPartner = new User();
        hotelPartner.setId(UUID.fromString("11111111-1111-1111-1111-111111111111"));
        hotelPartner.setName("Hotel Partner");
        hotelPartner.setEmail("hotel@example.com");
        hotelPartner.setRole(Role.ROLE_HOTEL_PROVIDER);
        hotelPartner.setStatus(ApprovalStatus.PENDING);
        hotelPartner.setCreatedAt(LocalDateTime.of(2026, 7, 1, 9, 0));
        when(userRepository.findByStatusAndRoleIn(eq(ApprovalStatus.PENDING), any()))
                .thenReturn(List.of(hotelPartner));

        List<PendingPartnerResponse> responses = userService.listPendingPartners();

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).email()).isEqualTo("hotel@example.com");
        assertThat(responses.get(0).role()).isEqualTo(Role.ROLE_HOTEL_PROVIDER.name());
    }

    @Test
    void approvePartnerSetsStatusApproved() {
        User pending = new User();
        pending.setId(UUID.fromString("11111111-1111-1111-1111-111111111111"));
        pending.setName("Rahul Hotel Provider");
        pending.setRole(Role.ROLE_HOTEL_PROVIDER);
        pending.setStatus(ApprovalStatus.PENDING);
        when(userRepository.findById(pending.getId())).thenReturn(Optional.of(pending));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(providerRepository.save(any(Provider.class))).thenAnswer(invocation -> {
            Provider provider = invocation.getArgument(0);
            provider.setId(42L);
            return provider;
        });

        UserResponse response = userService.approvePartner(pending.getId());

        assertThat(response.role()).isEqualTo(Role.ROLE_HOTEL_PROVIDER.name());
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(captor.getValue().getProviderId()).isEqualTo(42L);
    }

    @Test
    void approvePartnerDoesNotCreateANewProviderWhenAlreadyLinked() {
        User pending = new User();
        pending.setId(UUID.fromString("55555555-5555-5555-5555-555555555555"));
        pending.setRole(Role.ROLE_HOTEL_PROVIDER);
        pending.setStatus(ApprovalStatus.PENDING);
        pending.setProviderId(7L);
        when(userRepository.findById(pending.getId())).thenReturn(Optional.of(pending));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        userService.approvePartner(pending.getId());

        verifyNoInteractions(providerRepository);
    }

    @Test
    void rejectPartnerSetsStatusRejected() {
        User pending = new User();
        pending.setId(UUID.fromString("22222222-2222-2222-2222-222222222222"));
        pending.setRole(Role.ROLE_PROVIDER);
        pending.setStatus(ApprovalStatus.PENDING);
        when(userRepository.findById(pending.getId())).thenReturn(Optional.of(pending));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        userService.rejectPartner(pending.getId());

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(ApprovalStatus.REJECTED);
    }

    @Test
    void approvePartnerThrowsWhenUserNotFound() {
        UUID id = UUID.fromString("33333333-3333-3333-3333-333333333333");
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.approvePartner(id))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void approvePartnerThrowsWhenUserIsNotAPendingProvider() {
        User traveler = new User();
        traveler.setId(UUID.fromString("44444444-4444-4444-4444-444444444444"));
        traveler.setRole(Role.ROLE_TRAVELER);
        traveler.setStatus(ApprovalStatus.APPROVED);
        when(userRepository.findById(traveler.getId())).thenReturn(Optional.of(traveler));

        assertThatThrownBy(() -> userService.approvePartner(traveler.getId()))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void getByEmailReturnsUserWhenFound() {
        User user = new User();
        user.setEmail("asha@example.com");
        when(userRepository.findByEmail("asha@example.com")).thenReturn(Optional.of(user));

        assertThat(userService.getByEmail("asha@example.com")).isSameAs(user);
    }

    @Test
    void getByEmailThrowsWhenNotFound() {
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getByEmail("missing@example.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateProfileUpdatesNameAndPhone() {
        User user = new User();
        user.setEmail("asha@example.com");
        user.setName("Asha");
        user.setPhone("9999999999");
        when(userRepository.findByEmail("asha@example.com")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User updated = userService.updateProfile("asha@example.com", "Asha Rao", "8888888888");

        assertThat(updated.getName()).isEqualTo("Asha Rao");
        assertThat(updated.getPhone()).isEqualTo("8888888888");
    }

    @Test
    void updateProfileThrowsWhenUserNotFound() {
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateProfile("missing@example.com", "Name", "123"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void changePasswordUpdatesHashWhenSecurityAnswerMatches() {
        User user = new User();
        user.setEmail("asha@example.com");
        user.setSecurityAnswerHash("hashed-answer");
        when(userRepository.findByEmail("asha@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("City General", "hashed-answer")).thenReturn(true);
        when(passwordEncoder.encode("NewPassw0rd1")).thenReturn("hashed-new-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        userService.changePassword("asha@example.com", "City General", "NewPassw0rd1");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getPasswordHash()).isEqualTo("hashed-new-password");
    }

    @Test
    void changePasswordThrowsWhenSecurityAnswerDoesNotMatch() {
        User user = new User();
        user.setEmail("asha@example.com");
        user.setSecurityAnswerHash("hashed-answer");
        when(userRepository.findByEmail("asha@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Wrong Answer", "hashed-answer")).thenReturn(false);

        assertThatThrownBy(() -> userService.changePassword("asha@example.com", "Wrong Answer", "NewPassw0rd1"))
                .isInstanceOf(InvalidRequestException.class);
        verify(userRepository, org.mockito.Mockito.never()).save(any(User.class));
    }

    @Test
    void searchTravelersReturnsMatchingTravelersMappedToResponses() {
        User user = new User();
        user.setId(UUID.fromString("11111111-1111-1111-1111-111111111111"));
        user.setName("Asha Rao");
        user.setEmail("asha@example.com");
        user.setRole(Role.ROLE_TRAVELER);
        when(userRepository.searchByRoleAndNameOrEmail(eq(Role.ROLE_TRAVELER), eq("asha"), any(Pageable.class)))
                .thenReturn(List.of(user));

        List<UserResponse> responses = userService.searchTravelers("asha");

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).name()).isEqualTo("Asha Rao");
        assertThat(responses.get(0).email()).isEqualTo("asha@example.com");
    }

    @Test
    void searchTravelersTrimsQueryBeforeDelegatingToRepository() {
        when(userRepository.searchByRoleAndNameOrEmail(eq(Role.ROLE_TRAVELER), eq("asha"), any(Pageable.class)))
                .thenReturn(List.of());

        userService.searchTravelers("  asha  ");

        verify(userRepository).searchByRoleAndNameOrEmail(eq(Role.ROLE_TRAVELER), eq("asha"), any(Pageable.class));
    }

    @Test
    void searchTravelersReturnsEmptyListForBlankQueryWithoutQueryingRepository() {
        assertThat(userService.searchTravelers("   ")).isEmpty();
        assertThat(userService.searchTravelers(null)).isEmpty();
        verifyNoInteractions(userRepository);
    }
}
