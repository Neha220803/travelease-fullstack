package com.travelease.backend.busbooking.controller;

import com.travelease.backend.shared.dto.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A real (non-mocked) Spring context is required here: this reproduces a
 * @Transactional propagation bug (CouponServiceImpl.validateCoupon sharing its
 * caller's ambient transaction) that a Mockito-mocked CouponService can never
 * exercise, since the bug is in Spring's real AOP transaction-proxy behavior,
 * not in any business logic a unit test could stub around.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class FareCalculationCouponIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    // Seeded Mumbai -> Goa schedule (2026-07-15) and two of its seats, per
    // seed_data.sql - same schedule/seat data every other busbooking test in
    // this codebase already relies on being deterministic.
    private static final int SEEDED_MUMBAI_GOA_SCHEDULE_ID = 13;
    private static final List<Integer> SEEDED_SEAT_IDS = List.of(1, 2);

    @Test
    void calculateFareWithInvalidCouponReturnsGracefulZeroDiscountNotServerError() {
        String token = loginAndGetToken("alice@travelease.test", "password123");
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> request = Map.of(
                "scheduleId", SEEDED_MUMBAI_GOA_SCHEDULE_ID,
                "seatIds", SEEDED_SEAT_IDS,
                "couponCode", "BOGUS-CODE-THAT-DOES-NOT-EXIST");

        ResponseEntity<com.travelease.backend.busbooking.dto.response.ApiResponse> response = restTemplate.postForEntity(
                "/api/fares/calculate", new HttpEntity<>(request, headers),
                com.travelease.backend.busbooking.dto.response.ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) response.getBody().getData();
        @SuppressWarnings("unchecked")
        Map<String, Object> breakdown = (Map<String, Object>) data.get("breakdown");
        assertThat(breakdown.get("appliedCoupon")).isNull();
        assertThat(((Number) breakdown.get("couponDiscount")).doubleValue()).isEqualTo(0.0);
    }

    @Test
    void calculateFareWithValidCouponAppliesTheDiscount() {
        String token = loginAndGetToken("alice@travelease.test", "password123");
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> request = Map.of(
                "scheduleId", SEEDED_MUMBAI_GOA_SCHEDULE_ID,
                "seatIds", SEEDED_SEAT_IDS,
                "couponCode", "FIRST100");

        ResponseEntity<com.travelease.backend.busbooking.dto.response.ApiResponse> response = restTemplate.postForEntity(
                "/api/fares/calculate", new HttpEntity<>(request, headers),
                com.travelease.backend.busbooking.dto.response.ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) response.getBody().getData();
        @SuppressWarnings("unchecked")
        Map<String, Object> breakdown = (Map<String, Object>) data.get("breakdown");
        assertThat(breakdown.get("appliedCoupon")).isEqualTo("FIRST100");
        assertThat(((Number) breakdown.get("couponDiscount")).doubleValue()).isGreaterThan(0.0);
    }

    private String loginAndGetToken(String email, String password) {
        Map<String, String> loginRequest = Map.of("email", email, "password", password);
        ResponseEntity<ApiResponse> loginResponse =
                restTemplate.postForEntity("/api/auth/login", loginRequest, ApiResponse.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) loginResponse.getBody().data();
        return (String) data.get("accessToken");
    }
}
