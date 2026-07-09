package com.travelease.backend.itinerary.dto;

/** A selectable Activity Provider tenant for the traveler-facing "pick a provider, then pick their activity" itinerary flow. */
public record ActivityProviderOption(Long providerId, String providerName) {
}
