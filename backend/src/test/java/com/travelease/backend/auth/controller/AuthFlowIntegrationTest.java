package com.travelease.backend.auth.controller;

import com.travelease.backend.auth.dto.LoginRequest;
import com.travelease.backend.auth.dto.PartnerRegisterRequest;
import com.travelease.backend.auth.dto.RegisterRequest;
import com.travelease.backend.shared.dto.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthFlowIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void healthEndpointIsPublicAndReportsUp() {
        ResponseEntity<ApiResponse> response = restTemplate.getForEntity("/health", ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().success()).isTrue();
    }

    @Test
    void registerThenLoginThenMeWorksEndToEnd() {
        RegisterRequest registerRequest = new RegisterRequest("Asha", "asha-flow@example.com", "9999999999", "Passw0rd1!", "What is your birth hospital?", "City General");
        ResponseEntity<ApiResponse> registerResponse =
                restTemplate.postForEntity("/api/auth/register", registerRequest, ApiResponse.class);
        assertThat(registerResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        LoginRequest loginRequest = new LoginRequest("asha-flow@example.com", "Passw0rd1!");
        ResponseEntity<ApiResponse> loginResponse =
                restTemplate.postForEntity("/api/auth/login", loginRequest, ApiResponse.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        @SuppressWarnings("unchecked")
        Map<String, Object> loginData = (Map<String, Object>) loginResponse.getBody().data();
        String token = (String) loginData.get("accessToken");
        assertThat(token).isNotBlank();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        ResponseEntity<ApiResponse> meResponse = restTemplate.exchange(
                "/api/auth/me",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                ApiResponse.class
        );

        assertThat(meResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        @SuppressWarnings("unchecked")
        Map<String, Object> userData = (Map<String, Object>) meResponse.getBody().data();
        assertThat(userData.get("email")).isEqualTo("asha-flow@example.com");
        assertThat(userData.get("securityQuestion")).isEqualTo("What is your birth hospital?");
    }

    @Test
    void meEndpointRejectsRequestsWithoutToken() {
        ResponseEntity<ApiResponse> response = restTemplate.getForEntity("/api/auth/me", ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void registerRejectsDuplicateEmail() {
        RegisterRequest registerRequest = new RegisterRequest("Asha", "asha-dup@example.com", "9999999999", "Passw0rd1!", "What is your birth hospital?", "City General");
        restTemplate.postForEntity("/api/auth/register", registerRequest, ApiResponse.class);

        ResponseEntity<ApiResponse> secondResponse =
                restTemplate.postForEntity("/api/auth/register", registerRequest, ApiResponse.class);

        assertThat(secondResponse.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void loginRejectsWrongPassword() {
        RegisterRequest registerRequest = new RegisterRequest("Asha", "asha-wrong@example.com", "9999999999", "Passw0rd1!", "What is your birth hospital?", "City General");
        restTemplate.postForEntity("/api/auth/register", registerRequest, ApiResponse.class);

        LoginRequest loginRequest = new LoginRequest("asha-wrong@example.com", "WrongPassword1");
        ResponseEntity<ApiResponse> response = restTemplate.postForEntity("/api/auth/login", loginRequest, ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void partnerRegistrationStartsPendingAndBlocksLoginUntilApproved() {
        PartnerRegisterRequest registerRequest = new PartnerRegisterRequest(
                "Priya Partner", "priya-partner@example.com", "9999999999", "Passw0rd1!",
                "HOTEL_PROVIDER", "What is your birth hospital?", "City General");
        ResponseEntity<ApiResponse> registerResponse =
                restTemplate.postForEntity("/api/auth/register/partner", registerRequest, ApiResponse.class);
        assertThat(registerResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        LoginRequest loginRequest = new LoginRequest("priya-partner@example.com", "Passw0rd1!");
        ResponseEntity<ApiResponse> loginResponse =
                restTemplate.postForEntity("/api/auth/login", loginRequest, ApiResponse.class);

        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(loginResponse.getBody().error().code()).isEqualTo("ACCOUNT_NOT_APPROVED");
    }

    @Test
    void adminApprovesPendingPartnerAllowingLogin() {
        PartnerRegisterRequest registerRequest = new PartnerRegisterRequest(
                "Priya Partner", "priya-approve@example.com", "9999999999", "Passw0rd1!",
                "HOTEL_PROVIDER", "What is your birth hospital?", "City General");
        restTemplate.postForEntity("/api/auth/register/partner", registerRequest, ApiResponse.class);

        String adminToken = loginAndGetToken("admin@travelease.test", "password123");
        HttpHeaders adminHeaders = new HttpHeaders();
        adminHeaders.setBearerAuth(adminToken);

        ResponseEntity<ApiResponse> pendingResponse = restTemplate.exchange(
                "/api/admin/partners/pending", HttpMethod.GET, new HttpEntity<>(adminHeaders), ApiResponse.class);
        assertThat(pendingResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> pending = (List<Map<String, Object>>) pendingResponse.getBody().data();
        String partnerId = pending.stream()
                .filter(p -> "priya-approve@example.com".equals(p.get("email")))
                .findFirst().orElseThrow().get("id").toString();

        ResponseEntity<ApiResponse> approveResponse = restTemplate.exchange(
                "/api/admin/partners/" + partnerId + "/approve", HttpMethod.PUT, new HttpEntity<>(adminHeaders), ApiResponse.class);
        assertThat(approveResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        LoginRequest loginRequest = new LoginRequest("priya-approve@example.com", "Passw0rd1!");
        ResponseEntity<ApiResponse> loginResponse = restTemplate.postForEntity("/api/auth/login", loginRequest, ApiResponse.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        @SuppressWarnings("unchecked")
        Map<String, Object> responseData = (Map<String, Object>) loginResponse.getBody().data();
        @SuppressWarnings("unchecked")
        Map<String, Object> userMap = (Map<String, Object>) responseData.get("user");
        assertThat(userMap.get("providerId")).isNotNull();
        assertThat(((Number) userMap.get("providerId")).longValue()).isGreaterThanOrEqualTo(101L);
    }

    @Test
    void approvedHotelProviderCanAccessProviderScopedEndpointsAndHasAProviderId() {
        PartnerRegisterRequest registerRequest = new PartnerRegisterRequest(
                "Priya Partner", "priya-linked@example.com", "9999999999", "Passw0rd1!",
                "HOTEL_PROVIDER", "What is your birth hospital?", "City General");
        restTemplate.postForEntity("/api/auth/register/partner", registerRequest, ApiResponse.class);

        String adminToken = loginAndGetToken("admin@travelease.test", "password123");
        HttpHeaders adminHeaders = new HttpHeaders();
        adminHeaders.setBearerAuth(adminToken);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> pending = (List<Map<String, Object>>) restTemplate.exchange(
                "/api/admin/partners/pending", HttpMethod.GET, new HttpEntity<>(adminHeaders), ApiResponse.class)
                .getBody().data();
        String partnerId = pending.stream()
                .filter(p -> "priya-linked@example.com".equals(p.get("email")))
                .findFirst().orElseThrow().get("id").toString();
        restTemplate.exchange(
                "/api/admin/partners/" + partnerId + "/approve", HttpMethod.PUT, new HttpEntity<>(adminHeaders), ApiResponse.class);

        String partnerToken = loginAndGetToken("priya-linked@example.com", "Passw0rd1!");
        HttpHeaders partnerHeaders = new HttpHeaders();
        partnerHeaders.setBearerAuth(partnerToken);

        ResponseEntity<ApiResponse> meResponse = restTemplate.exchange(
                "/api/auth/me", HttpMethod.GET, new HttpEntity<>(partnerHeaders), ApiResponse.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> meData = (Map<String, Object>) meResponse.getBody().data();
        assertThat(meData.get("providerId")).isNotNull();

        ResponseEntity<ApiResponse> hotelsResponse = restTemplate.exchange(
                "/api/provider/hotels", HttpMethod.GET, new HttpEntity<>(partnerHeaders), ApiResponse.class);
        assertThat(hotelsResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private String loginAndGetToken(String email, String password) {
        LoginRequest loginRequest = new LoginRequest(email, password);
        ResponseEntity<ApiResponse> loginResponse = restTemplate.postForEntity("/api/auth/login", loginRequest, ApiResponse.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) loginResponse.getBody().data();
        return (String) data.get("accessToken");
    }

    @Test
    void registerRejectsInvalidPayload() {
        RegisterRequest invalidRequest = new RegisterRequest("", "not-an-email", "9999999999", "short", "", "");

        ResponseEntity<ApiResponse> response =
                restTemplate.postForEntity("/api/auth/register", invalidRequest, ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void registerRejectsPasswordMissingSpecialCharacter() {
        RegisterRequest invalidRequest = new RegisterRequest(
                "Asha", "asha-weak-pwd@example.com", "9999999999", "Passw0rd1",
                "What is your birth hospital?", "City General");

        ResponseEntity<ApiResponse> response =
                restTemplate.postForEntity("/api/auth/register", invalidRequest, ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void registerRejectsPhoneWithWrongDigitCount() {
        RegisterRequest invalidRequest = new RegisterRequest(
                "Asha", "asha-bad-phone@example.com", "12345", "Passw0rd1!",
                "What is your birth hospital?", "City General");

        ResponseEntity<ApiResponse> response =
                restTemplate.postForEntity("/api/auth/register", invalidRequest, ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void registerRejectsEmailOverMaxLength() {
        String overlongEmail = "a".repeat(95) + "@ex.com";
        RegisterRequest invalidRequest = new RegisterRequest(
                "Asha", overlongEmail, "9999999999", "Passw0rd1!",
                "What is your birth hospital?", "City General");

        ResponseEntity<ApiResponse> response =
                restTemplate.postForEntity("/api/auth/register", invalidRequest, ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void registerPartnerRejectsInvalidPayload() {
        PartnerRegisterRequest invalidRequest = new PartnerRegisterRequest(
                "", "not-an-email", "12345", "short", "HOTEL_PROVIDER", "", "");

        ResponseEntity<ApiResponse> response =
                restTemplate.postForEntity("/api/auth/register/partner", invalidRequest, ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void updateProfileChangesNameAndPhoneForAuthenticatedUser() {
        RegisterRequest registerRequest = new RegisterRequest("Asha", "asha-update@example.com", "9999999999", "Passw0rd1!", "What is your birth hospital?", "City General");
        restTemplate.postForEntity("/api/auth/register", registerRequest, ApiResponse.class);
        String token = loginAndGetToken("asha-update@example.com", "Passw0rd1!");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        Map<String, String> updateBody = Map.of("name", "Asha Rao", "phone", "8888888888");
        ResponseEntity<ApiResponse> response = restTemplate.exchange(
                "/api/auth/me", HttpMethod.PUT, new HttpEntity<>(updateBody, headers), ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) response.getBody().data();
        assertThat(data.get("name")).isEqualTo("Asha Rao");
        assertThat(data.get("phone")).isEqualTo("8888888888");
    }

    @Test
    void updateProfileRejectsBlankName() {
        RegisterRequest registerRequest = new RegisterRequest("Asha", "asha-update-blank@example.com", "9999999999", "Passw0rd1!", "What is your birth hospital?", "City General");
        restTemplate.postForEntity("/api/auth/register", registerRequest, ApiResponse.class);
        String token = loginAndGetToken("asha-update-blank@example.com", "Passw0rd1!");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        Map<String, String> updateBody = Map.of("name", "", "phone", "8888888888");
        ResponseEntity<ApiResponse> response = restTemplate.exchange(
                "/api/auth/me", HttpMethod.PUT, new HttpEntity<>(updateBody, headers), ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void changePasswordAllowsLoginWithNewPasswordAfterCorrectSecurityAnswer() {
        RegisterRequest registerRequest = new RegisterRequest("Asha", "asha-pwd@example.com", "9999999999", "Passw0rd1!", "What is your birth hospital?", "City General");
        restTemplate.postForEntity("/api/auth/register", registerRequest, ApiResponse.class);
        String token = loginAndGetToken("asha-pwd@example.com", "Passw0rd1!");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        Map<String, String> changeBody = Map.of("securityAnswer", "City General", "newPassword", "NewPassw0rd1");
        ResponseEntity<ApiResponse> response = restTemplate.exchange(
                "/api/auth/change-password", HttpMethod.POST, new HttpEntity<>(changeBody, headers), ApiResponse.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        LoginRequest newLogin = new LoginRequest("asha-pwd@example.com", "NewPassw0rd1");
        ResponseEntity<ApiResponse> loginResponse = restTemplate.postForEntity("/api/auth/login", newLogin, ApiResponse.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void changePasswordRejectsWrongSecurityAnswer() {
        RegisterRequest registerRequest = new RegisterRequest("Asha", "asha-pwd-wrong@example.com", "9999999999", "Passw0rd1!", "What is your birth hospital?", "City General");
        restTemplate.postForEntity("/api/auth/register", registerRequest, ApiResponse.class);
        String token = loginAndGetToken("asha-pwd-wrong@example.com", "Passw0rd1!");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        Map<String, String> changeBody = Map.of("securityAnswer", "Wrong Answer", "newPassword", "NewPassw0rd1");
        ResponseEntity<ApiResponse> response = restTemplate.exchange(
                "/api/auth/change-password", HttpMethod.POST, new HttpEntity<>(changeBody, headers), ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void resetPasswordAllowsLoginWithNewPasswordWithoutAnyAuthToken() {
        RegisterRequest registerRequest = new RegisterRequest("Asha", "asha-reset@example.com", "9999999999", "Passw0rd1!", "What is your birth hospital?", "City General");
        restTemplate.postForEntity("/api/auth/register", registerRequest, ApiResponse.class);

        Map<String, String> resetBody = Map.of(
                "email", "asha-reset@example.com",
                "securityAnswer", "City General",
                "newPassword", "NewPassw0rd1");
        ResponseEntity<ApiResponse> response = restTemplate.postForEntity("/api/auth/reset-password", resetBody, ApiResponse.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        LoginRequest newLogin = new LoginRequest("asha-reset@example.com", "NewPassw0rd1");
        ResponseEntity<ApiResponse> loginResponse = restTemplate.postForEntity("/api/auth/login", newLogin, ApiResponse.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void resetPasswordRejectsWrongSecurityAnswer() {
        RegisterRequest registerRequest = new RegisterRequest("Asha", "asha-reset-wrong@example.com", "9999999999", "Passw0rd1!", "What is your birth hospital?", "City General");
        restTemplate.postForEntity("/api/auth/register", registerRequest, ApiResponse.class);

        Map<String, String> resetBody = Map.of(
                "email", "asha-reset-wrong@example.com",
                "securityAnswer", "Wrong Answer",
                "newPassword", "NewPassw0rd1");
        ResponseEntity<ApiResponse> response = restTemplate.postForEntity("/api/auth/reset-password", resetBody, ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
