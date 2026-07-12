package com.travelease.backend.auth.dto;

public record ProviderDto(
        Long id,
        String businessName,
        String type
) {
}
