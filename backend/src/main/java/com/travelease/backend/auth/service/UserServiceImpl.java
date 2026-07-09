package com.travelease.backend.auth.service;

import com.travelease.backend.auth.dto.RegisterRequest;
import com.travelease.backend.auth.dto.UserResponse;
import com.travelease.backend.auth.entity.Role;
import com.travelease.backend.auth.entity.User;
import com.travelease.backend.auth.repository.UserRepository;
import com.travelease.backend.shared.exception.DuplicateResourceException;
import com.travelease.backend.shared.exception.ResourceNotFoundException;
import com.travelease.backend.itinerary.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;

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

    private UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getPhone(), user.getRole().name(), user.getProviderId());
    }
}
