package com.travelease.backend.busbooking.controller;

import com.travelease.backend.busbooking.dto.request.BusSearchCriteriaRequest;
import com.travelease.backend.busbooking.dto.request.ScheduleRequest;
import com.travelease.backend.busbooking.dto.response.*;
import com.travelease.backend.busbooking.service.ScheduleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/schedules")
@RequiredArgsConstructor
@Tag(name = "Schedule Management", description = "Bus schedule management (ROLE_PROVIDER, tenant-isolated by "
        + "transport providerId via the schedule's own Bus) plus traveler-facing bus search. Most GET/search "
        + "endpoints are PUBLIC per SecurityConfig; two (search/history, search/suggestions) are the exception "
        + "and require authentication despite living under the same /api/schedules/** path.")
public class ScheduleController {

    private final ScheduleService scheduleService;
    private final com.travelease.backend.busbooking.service.BusService busService;
    private final com.travelease.backend.busbooking.security.SecurityUtil securityUtil;

    @GetMapping
    @Operation(summary = "Get all schedules", description = "ACCESS: PUBLIC (no JWT required).")
    public ResponseEntity<ApiResponse<List<ScheduleResponse>>> getAllSchedules() {
        List<ScheduleResponse> response = scheduleService.getAllSchedules();
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Schedules fetched successfully", response, "/api/schedules"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get schedule by ID", description = "ACCESS: PUBLIC (no JWT required).")
    public ResponseEntity<ApiResponse<ScheduleResponse>> getScheduleById(@PathVariable Long id) {
        ScheduleResponse response = scheduleService.getScheduleById(id);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Schedule fetched successfully", response, "/api/schedules/" + id));
    }

    @GetMapping("/search")
    @Operation(summary = "Search buses by source, destination, and travel date", description = "ACCESS: PUBLIC "
            + "(no JWT required).")
    public ResponseEntity<ApiResponse<List<BusSearchResponse>>> searchBuses(
            @RequestParam String source,
            @RequestParam String destination,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<BusSearchResponse> response = scheduleService.searchBuses(source, destination, date);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Bus search completed successfully", response, "/api/schedules/search"));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Create a new schedule", description = "ACCESS: ROLE_PROVIDER (transport) or ROLE_ADMIN.\n\n"
            + "SCOPE: Only for a Bus owned by the caller's own transport providerId; ROLE_ADMIN bypasses.")
    public ResponseEntity<ApiResponse<ScheduleResponse>> createSchedule(@Valid @RequestBody ScheduleRequest request) {
        assertOwnsBus(request.getBusId());
        ScheduleResponse response = scheduleService.createSchedule(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(HttpStatus.CREATED.value(), "Schedule created successfully", response, "/api/schedules"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Update schedule by ID", description = "ACCESS: ROLE_PROVIDER (transport) or ROLE_ADMIN.\n\n"
            + "SCOPE: Owning transport provider only (checked against both the existing schedule and the new "
            + "busId in the request); ROLE_ADMIN bypasses.")
    public ResponseEntity<ApiResponse<ScheduleResponse>> updateSchedule(@PathVariable Long id,
                                                                         @Valid @RequestBody ScheduleRequest request) {
        assertOwnsSchedule(id);
        assertOwnsBus(request.getBusId());
        ScheduleResponse response = scheduleService.updateSchedule(id, request);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Schedule updated successfully", response, "/api/schedules/" + id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Cancel/delete schedule by ID", description = "ACCESS: ROLE_PROVIDER (transport) or "
            + "ROLE_ADMIN.\n\n"
            + "SCOPE: Owning transport provider only; ROLE_ADMIN bypasses.")
    public ResponseEntity<ApiResponse<MessageResponse>> deleteSchedule(@PathVariable Long id) {
        assertOwnsSchedule(id);
        scheduleService.deleteSchedule(id);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Schedule cancelled successfully", new MessageResponse("Schedule cancelled successfully"), "/api/schedules/" + id));
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    // Phase 4 Ã¢â‚¬â€œ Smart Search & Traveller Discovery
    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    @PostMapping("/search/advanced")
    @Operation(summary = "Smart bus search with multi-filter, pagination, and dynamic sorting", description = "ACCESS: "
            + "PUBLIC (no JWT required).")
    public ResponseEntity<ApiResponse<PaginatedSearchResponse<SmartSearchResponse>>> smartSearch(
            @Valid @RequestBody BusSearchCriteriaRequest criteria) {
        PaginatedSearchResponse<SmartSearchResponse> response = scheduleService.smartSearch(criteria);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(),
                "Smart search completed successfully", response, "/api/schedules/search/advanced"));
    }

    @GetMapping("/search/popular-routes")
    @Operation(summary = "Get popular routes based on search frequency", description = "ACCESS: PUBLIC (no JWT "
            + "required).\n\nSCOPE: Cross-user aggregate by design, not scoped to the caller.")
    public ResponseEntity<ApiResponse<List<PopularRouteResponse>>> getPopularRoutes(
            @RequestParam(defaultValue = "10") int limit) {
        List<PopularRouteResponse> response = scheduleService.getPopularRoutes(limit);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(),
                "Popular routes fetched successfully", response, "/api/schedules/search/popular-routes"));
    }

    @GetMapping("/search/history")
    @Operation(summary = "Get search history for current user (use sort=searchedAt,desc&size=5 for recent)",
            description = "ACCESS: AUTHENTICATED (any role) - explicitly declared in SecurityConfig ahead of "
                    + "the /api/schedules/** public wildcard, since this endpoint depends on the current user.\n\n"
                    + "SCOPE: Current-user only.")
    public ResponseEntity<ApiResponse<List<SearchHistoryResponse>>> getSearchHistory(
            @PageableDefault(size = 20, sort = "searchedAt") Pageable pageable) {
        List<SearchHistoryResponse> response = scheduleService.getSearchHistory(pageable);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(),
                "Search history fetched successfully", response, "/api/schedules/search/history"));
    }

    @GetMapping("/search/suggestions")
    @Operation(summary = "Get search suggestions based on previous bookings", description = "ACCESS: "
            + "AUTHENTICATED (any role) - same explicit pre-wildcard declaration as search/history above.\n\n"
            + "SCOPE: Current-user only (based on the caller's own booking history).")
    public ResponseEntity<ApiResponse<List<SearchSuggestionResponse>>> getSearchSuggestions(
            @RequestParam(defaultValue = "5") int limit) {
        List<SearchSuggestionResponse> response = scheduleService.getSearchSuggestions(limit);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(),
                "Search suggestions fetched successfully", response, "/api/schedules/search/suggestions"));
    }

    @GetMapping("/search/frequently-booked")
    @Operation(summary = "Get frequently booked routes across all users", description = "ACCESS: PUBLIC (no JWT "
            + "required).\n\nSCOPE: Cross-user aggregate by design, not scoped to the caller.")
    public ResponseEntity<ApiResponse<List<PopularRouteResponse>>> getFrequentlyBookedRoutes(
            @RequestParam(defaultValue = "10") int limit) {
        List<PopularRouteResponse> response = scheduleService.getFrequentlyBookedRoutes(limit);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(),
                "Frequently booked routes fetched successfully", response, "/api/schedules/search/frequently-booked"));
    }

    private void assertOwnsBus(Long busId) {
        securityUtil.resolveEffectiveProviderId(busService.getBusById(busId).getProviderId());
    }

    private void assertOwnsSchedule(Long scheduleId) {
        ScheduleResponse existing = scheduleService.getScheduleById(scheduleId);
        securityUtil.resolveEffectiveProviderId(existing.getBus().getProviderId());
    }
}

