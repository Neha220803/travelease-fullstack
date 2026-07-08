package com.travelease.backend.auth.service;

import com.travelease.backend.auth.dto.AdminCreateUserRequest;
import com.travelease.backend.auth.dto.RegisterRequest;
import com.travelease.backend.auth.dto.UserResponse;
import com.travelease.backend.auth.entity.Role;
import com.travelease.backend.auth.entity.User;
import com.travelease.backend.auth.repository.UserRepository;
import com.travelease.backend.shared.exception.DuplicateResourceException;
import com.travelease.backend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {
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
        user.setRole(Role.ROLE_TRAVELER);

        User saved = userRepository.save(user);
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
