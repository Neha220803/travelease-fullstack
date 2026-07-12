package com.travelease.backend.auth.service;

import com.travelease.backend.auth.SecurityQuestions;
import com.travelease.backend.auth.dto.AdminCreateUserRequest;
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
import com.travelease.backend.itinerary.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final ProviderRepository providerRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;

    private static final List<Role> PROVIDER_ROLES =
            List.of(Role.ROLE_PROVIDER, Role.ROLE_HOTEL_PROVIDER, Role.ROLE_ACTIVITY_PROVIDER);

    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("Email is already registered: " + request.email());
        }
        if (!SecurityQuestions.ALLOWED.contains(request.securityQuestion())) {
            throw new InvalidRequestException("securityQuestion must be one of the supported security questions");
        }

        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPhone(request.phone());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setSecurityQuestion(request.securityQuestion());
        user.setSecurityAnswerHash(passwordEncoder.encode(request.securityAnswer()));
        user.setRole(Role.ROLE_TRAVELER);

        User saved = userRepository.save(user);

        // Notify admins about the new user registration
        userRepository.findByRole(Role.ROLE_ADMIN).forEach(admin -> {
            notificationService.createNotification(
                    admin.getId().toString(),
                    "SYSTEM",
                    "New User Registered",
                    "User " + saved.getName() + " (" + saved.getEmail() + ") has registered."
            );
        });

        return toResponse(saved);
    }

    @Override
    public List<UserResponse> listUsers() {
        return userRepository.findAll().stream()
                .map(this::toResponse)
                .sorted(Comparator.comparing(UserResponse::name, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Override
    @Transactional
    public UserResponse createByAdmin(AdminCreateUserRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("Email is already registered: " + request.email());
        }

        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPhone(request.phone());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setSecurityQuestion(request.securityQuestion());
        user.setSecurityAnswerHash(passwordEncoder.encode(request.securityAnswer()));
        user.setRole(mapRole(request.role()));
        user.setProviderId(null);

        User saved = userRepository.save(user);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public UserResponse registerPartner(PartnerRegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("Email is already registered: " + request.email());
        }
        if (!SecurityQuestions.ALLOWED.contains(request.securityQuestion())) {
            throw new InvalidRequestException("securityQuestion must be one of the supported security questions");
        }

        Role role = mapRole(request.role());
        if (!PROVIDER_ROLES.contains(role)) {
            throw new InvalidRequestException("role must be one of PROVIDER, HOTEL_PROVIDER, ACTIVITY_PROVIDER");
        }

        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPhone(request.phone());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setSecurityQuestion(request.securityQuestion());
        user.setSecurityAnswerHash(passwordEncoder.encode(request.securityAnswer()));
        user.setRole(role);
        user.setStatus(ApprovalStatus.PENDING);

        User saved = userRepository.save(user);
        return toResponse(saved);
    }

    @Override
    public List<PendingPartnerResponse> listPendingPartners() {
        return userRepository.findByStatusAndRoleIn(ApprovalStatus.PENDING, PROVIDER_ROLES).stream()
                .map(u -> new PendingPartnerResponse(u.getId(), u.getName(), u.getEmail(), u.getRole().name(), u.getCreatedAt()))
                .sorted(Comparator.comparing(PendingPartnerResponse::createdAt))
                .toList();
    }

    @Override
    @Transactional
    public UserResponse approvePartner(UUID id) {
        User user = findPendingPartnerOrThrow(id);
        user.setStatus(ApprovalStatus.APPROVED);
        if (user.getProviderId() == null) {
            Provider provider = new Provider();
            provider.setBusinessName(user.getName());
            provider.setType(user.getRole());
            user.setProviderId(providerRepository.save(provider).getId());
        }
        return toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse rejectPartner(UUID id) {
        User user = findPendingPartnerOrThrow(id);
        user.setStatus(ApprovalStatus.REJECTED);
        return toResponse(userRepository.save(user));
    }

    private User findPendingPartnerOrThrow(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        if (!PROVIDER_ROLES.contains(user.getRole()) || user.getStatus() != ApprovalStatus.PENDING) {
            throw new InvalidRequestException("User is not a pending partner application");
        }
        return user;
    }

    @Override
    public boolean verifySecurityAnswer(String email, String answer) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
        return passwordEncoder.matches(answer, user.getSecurityAnswerHash());
    }

    @Override
    public User getByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    @Override
    @Transactional
    public User updateProfile(String email, String name, String phone) {
        User user = getByEmail(email);
        user.setName(name);
        user.setPhone(phone);
        return userRepository.save(user);
    }

    @Override
    @Transactional
    public void changePassword(String email, String securityAnswer, String newPassword) {
        User user = getByEmail(email);
        if (!passwordEncoder.matches(securityAnswer, user.getSecurityAnswerHash())) {
            throw new InvalidRequestException("Security answer did not match");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Override
    public List<UserResponse> searchTravelers(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        return userRepository
                .searchByRoleAndNameOrEmail(Role.ROLE_TRAVELER, query.trim(), PageRequest.of(0, 10))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private Role mapRole(String role) {
        return switch (role.toUpperCase()) {
            case "ADMIN" -> Role.ROLE_ADMIN;
            case "TRAVELER" -> Role.ROLE_TRAVELER;
            case "PROVIDER" -> Role.ROLE_PROVIDER;
            case "HOTEL_PROVIDER" -> Role.ROLE_HOTEL_PROVIDER;
            case "ACTIVITY_PROVIDER" -> Role.ROLE_ACTIVITY_PROVIDER;
            default -> throw new IllegalArgumentException("Unsupported role: " + role);
        };
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getPhone(), user.getRole().name(), user.getProviderId());
    }
}
