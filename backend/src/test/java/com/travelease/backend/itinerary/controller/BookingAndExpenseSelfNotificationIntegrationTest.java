package com.travelease.backend.itinerary.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that a successful hotel booking, bus booking, or shared expense
 * creation always leaves a notification for the person who did it - not just
 * for other trip members/providers, and not only when a trip is attached.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class BookingAndExpenseSelfNotificationIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void hotelBookingNotifiesTheBookerDirectly() {
        String token = loginAndGetToken("alice@travelease.test", "password123");
        HttpHeaders headers = jsonAuthHeaders(token);

        Map<String, Object> request = Map.of(
                "hotelId", "e2000000-0000-0000-0000-000000000001",
                "checkInDate", "2026-09-01",
                "checkOutDate", "2026-09-03",
                "roomType", "Standard");
        ResponseEntity<com.travelease.backend.shared.dto.ApiResponse> bookingResponse = restTemplate.postForEntity(
                "/api/hotel-bookings", new HttpEntity<>(request, headers),
                com.travelease.backend.shared.dto.ApiResponse.class);
        assertThat(bookingResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        List<?> notifications = getMyNotifications(token, headers);
        assertThat(notifications).anySatisfy(n -> {
            @SuppressWarnings("unchecked")
            Map<String, Object> notification = (Map<String, Object>) n;
            assertThat(notification.get("title")).isEqualTo("Hotel Booking Confirmed");
        });
    }

    @Test
    void busBookingNotifiesTheBookerDirectly() {
        String token = loginAndGetToken("alice@travelease.test", "password123");
        HttpHeaders headers = jsonAuthHeaders(token);

        // Seeded Mumbai -> Goa schedule (see FareCalculationCouponIntegrationTest); its
        // bus's own seat ids start at 41 (seat ids are per-bus, not per-schedule).
        Map<String, Object> request = Map.of(
                "scheduleId", 13,
                "seatIds", List.of(41, 42),
                "passengerDetails", List.of(
                        Map.of("seatId", 41, "passengerName", "Alice", "passengerAge", 30, "passengerGender", "FEMALE", "isPrimary", true),
                        Map.of("seatId", 42, "passengerName", "Bob", "passengerAge", 28, "passengerGender", "MALE")));
        ResponseEntity<com.travelease.backend.busbooking.dto.response.ApiResponse> bookingResponse = restTemplate.postForEntity(
                "/api/bookings", new HttpEntity<>(request, headers),
                com.travelease.backend.busbooking.dto.response.ApiResponse.class);
        assertThat(bookingResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        List<?> notifications = getMyNotifications(token, headers);
        assertThat(notifications).anySatisfy(n -> {
            @SuppressWarnings("unchecked")
            Map<String, Object> notification = (Map<String, Object>) n;
            assertThat(notification.get("title")).isEqualTo("Bus Booking Confirmed");
        });
    }

    @Test
    void sharedExpenseNotifiesTheCreatorDirectly() {
        String token = loginAndGetToken("alice@travelease.test", "password123");
        HttpHeaders headers = jsonAuthHeaders(token);
        String tripId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
        String aliceId = "11111111-1111-1111-1111-111111111111";
        String bobId = "22222222-2222-2222-2222-222222222222";

        Map<String, Object> request = Map.of(
                "amount", 500.00,
                "category", "Food",
                "description", "Self-notification test expense",
                "payerId", aliceId,
                "participantIds", List.of(aliceId, bobId));
        ResponseEntity<com.travelease.backend.shared.dto.ApiResponse> expenseResponse = restTemplate.postForEntity(
                "/api/trips/" + tripId + "/expenses", new HttpEntity<>(request, headers),
                com.travelease.backend.shared.dto.ApiResponse.class);
        assertThat(expenseResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        List<?> notifications = getMyNotifications(token, headers);
        assertThat(notifications).anySatisfy(n -> {
            @SuppressWarnings("unchecked")
            Map<String, Object> notification = (Map<String, Object>) n;
            assertThat(notification.get("title")).isEqualTo("Expense Logged");
        });
    }

    private List<?> getMyNotifications(String token, HttpHeaders headers) {
        ResponseEntity<List> response = restTemplate.exchange(
                "/api/notifications", HttpMethod.GET, new HttpEntity<>(headers), List.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody();
    }

    private HttpHeaders jsonAuthHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    private String loginAndGetToken(String email, String password) {
        Map<String, String> loginRequest = Map.of("email", email, "password", password);
        ResponseEntity<com.travelease.backend.shared.dto.ApiResponse> loginResponse = restTemplate.postForEntity(
                "/api/auth/login", loginRequest, com.travelease.backend.shared.dto.ApiResponse.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) loginResponse.getBody().data();
        return (String) data.get("accessToken");
    }
}
