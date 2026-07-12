package com.travelease.backend.accommodation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GuestDetailDto {
    @NotBlank
    private String name;
    @NotNull
    private Integer age;
    private String gender;
    private Boolean isPrimary;
}
