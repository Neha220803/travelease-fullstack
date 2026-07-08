package com.travelease.backend.busbooking.controller;

import com.travelease.backend.busbooking.dto.request.SeatLockRequest;
import com.travelease.backend.busbooking.dto.response.SeatLayoutResponse;
import com.travelease.backend.busbooking.dto.response.ApiResponse;
import com.travelease.backend.busbooking.dto.response.SeatLockResponse;
import com.travelease.backend.busbooking.dto.response.SeatOccupancyResponse;
import com.travelease.backend.busbooking.dto.response.SeatResponse;
import com.travelease.backend.busbooking.entity.enums.SeatStatus;
import com.travelease.backend.busbooking.service.SeatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/seats")
@RequiredArgsConstructor
@Tag(name = "Seat Management", description = "Seat layout, availability, and booking-time locking. No "
        + "@PreAuthorize on any endpoint here; GET endpoints are PUBLIC per SecurityConfig, while the lock/"
        + "unlock mutations fall through to the default authenticated-only rule (any of the five roles).")
public class SeatController {

    private final SeatService seatService;

    @GetMapping
    @Operation(summary = "Get seats with optional filters (busId for layout, scheduleId for availability)",
            description = "ACCESS: PUBLIC (no JWT required).")
    public ResponseEntity<ApiResponse<SeatLayoutResponse>> getSeats(
            @RequestParam(required = false) Long busId,
            @RequestParam(required = false) Long scheduleId,
            @RequestParam(required = false) SeatStatus status) {
        // If busId is provided, return seat layout; if scheduleId, return filtered available seats
        SeatLayoutResponse response = seatService.getSeats(busId, scheduleId, status);
        return ResponseEntity.ok(ApiResponse.success(200, "Seats fetched successfully", response, "/api/seats"));
    }

    @PostMapping("/lock")
    @Operation(summary = "Lock seats for booking", description = "ACCESS: AUTHENTICATED (any of the five roles) "
            + "- this path is not PUBLIC despite the base /api/seats GET being permitAll; POST is not covered "
            + "by SecurityConfig's GET-only wildcard, so it falls through to the default authenticated rule.")
    public ResponseEntity<ApiResponse<SeatLockResponse>> lockSeats(@Valid @RequestBody SeatLockRequest request) {
        SeatLockResponse response = seatService.lockSeats(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(HttpStatus.CREATED.value(), "Seats locked successfully", response, "/api/seats/lock"));
    }

    @DeleteMapping("/lock")
    @Operation(summary = "Unlock seats", description = "ACCESS: AUTHENTICATED (any of the five roles) - same "
            + "GET-only-permitAll caveat as lock above.")
    public ResponseEntity<ApiResponse<Void>> unlockSeats(@RequestParam Long scheduleId,
                                                         @RequestParam List<Long> seatIds) {
        seatService.unlockSeats(scheduleId, seatIds);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Seats unlocked successfully", null, "/api/seats/lock"));
    }

    @GetMapping("/schedule/{scheduleId}/occupancy")
    @Operation(summary = "Get seat occupancy for a schedule", description = "ACCESS: PUBLIC (no JWT required).")
    public ResponseEntity<ApiResponse<SeatOccupancyResponse>> getOccupancy(@PathVariable Long scheduleId) {
        SeatOccupancyResponse response = seatService.getOccupancy(scheduleId);
        return ResponseEntity.ok(ApiResponse.success(200, "Occupancy fetched successfully", response, "/api/seats/schedule/" + scheduleId + "/occupancy"));
    }
}

