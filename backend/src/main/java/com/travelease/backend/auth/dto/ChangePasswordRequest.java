package com.travelease.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "security answer is required")
        String securityAnswer,

        @NotBlank(message = "new password is required")
        @Size(min = 8, message = "new password must be at least 8 characters")
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$",
                message = "new password must contain at least one letter and one digit"
        )
        String newPassword
) {
}
