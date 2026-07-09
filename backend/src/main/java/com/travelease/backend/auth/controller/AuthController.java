package com.travelease.backend.auth.controller;

import com.travelease.backend.auth.dto.ChangePasswordRequest;
import com.travelease.backend.auth.dto.LoginRequest;
import com.travelease.backend.auth.dto.LoginResponse;
import com.travelease.backend.auth.dto.MeResponse;
import com.travelease.backend.auth.dto.PartnerRegisterRequest;
import com.travelease.backend.auth.dto.RegisterRequest;
import com.travelease.backend.auth.dto.ResetPasswordRequest;
import com.travelease.backend.auth.dto.SecurityAnswerRequest;
import com.travelease.backend.auth.dto.UpdateProfileRequest;
import com.travelease.backend.auth.dto.UserResponse;
import com.travelease.backend.auth.entity.User;
import com.travelease.backend.auth.service.AuthService;
import com.travelease.backend.auth.service.UserService;
import com.travelease.backend.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Public login and registration endpoints plus the current-user lookup")
public class AuthController {

    private final UserService userService;
    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Register a new user", description = "ACCESS: PUBLIC\nSCOPE: Creates a new user account.\nIDENTITY: No JWT is required.")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse user = userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(user, "User registered successfully"));
    }

    @PostMapping("/register/partner")
    @Operation(summary = "Register a new partner (provider) account", description = "ACCESS: PUBLIC\nSCOPE: Creates a hotel/transport/activity provider account pending admin approval.\nIDENTITY: No JWT is required.")
    public ResponseEntity<ApiResponse<UserResponse>> registerPartner(@Valid @RequestBody PartnerRegisterRequest request) {
        UserResponse user = userService.registerPartner(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(user, "Partner application submitted and awaiting admin approval"));
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email and password", description = "ACCESS: PUBLIC\nSCOPE: Authenticates credentials and returns the login response.\nIDENTITY: No JWT is required.")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse loginResponse = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success(loginResponse, "Login successful"));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Verify the recovery answer for a traveler", description = "ACCESS: PUBLIC\nSCOPE: Validates the stored recovery answer for password reset flow support.\nIDENTITY: Requires the user's email and the answer to the configured recovery question.")
    public ResponseEntity<ApiResponse<Boolean>> verifySecurityAnswer(@Valid @RequestBody SecurityAnswerRequest request) {
        boolean verified = userService.verifySecurityAnswer(request.email(), request.answer());
        return ResponseEntity.ok(ApiResponse.success(verified, verified ? "Security answer verified" : "Security answer did not match"));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset a forgotten password using the security answer", description = "ACCESS: PUBLIC\nSCOPE: Verifies the security answer for the given email then updates the password hash.\nIDENTITY: No JWT is required; identity is proven by the email + security answer pair, not by an authenticated session.")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        userService.changePassword(request.email(), request.securityAnswer(), request.newPassword());
        return ResponseEntity.ok(ApiResponse.success(null, "Password reset successfully"));
    }

    @GetMapping("/me")
    @Operation(summary = "Get the current authenticated user", description = "ACCESS: AUTHENTICATED\nSCOPE: Returns the user resolved from the current JWT identity.\nIDENTITY: The authenticated email from the security context is used; no client-supplied userId is trusted.")
    public ResponseEntity<ApiResponse<MeResponse>> me(Authentication authentication) {
        User user = userService.getByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(toMeResponse(user), "Current user retrieved"));
    }

    @PutMapping("/me")
    @Operation(summary = "Update the current authenticated user's profile", description = "ACCESS: AUTHENTICATED\nSCOPE: Updates name and phone for the user resolved from the current JWT identity.\nIDENTITY: The authenticated email from the security context is used; no client-supplied userId is trusted.")
    public ResponseEntity<ApiResponse<MeResponse>> updateMe(@Valid @RequestBody UpdateProfileRequest request, Authentication authentication) {
        User user = userService.updateProfile(authentication.getName(), request.name(), request.phone());
        return ResponseEntity.ok(ApiResponse.success(toMeResponse(user), "Profile updated successfully"));
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change the current authenticated user's password", description = "ACCESS: AUTHENTICATED\nSCOPE: Verifies the security answer then updates the password hash for the user resolved from the current JWT identity.\nIDENTITY: The authenticated email from the security context is used; no client-supplied userId is trusted.")
    public ResponseEntity<ApiResponse<Void>> changePassword(@Valid @RequestBody ChangePasswordRequest request, Authentication authentication) {
        userService.changePassword(authentication.getName(), request.securityAnswer(), request.newPassword());
        return ResponseEntity.ok(ApiResponse.success(null, "Password changed successfully"));
    }

    private MeResponse toMeResponse(User user) {
        return new MeResponse(
                user.getId(), user.getName(), user.getEmail(), user.getPhone(),
                user.getRole().name(), user.getProviderId(), user.getSecurityQuestion()
        );
    }
}
