package com.travelease.backend.busbooking.controller;

import com.travelease.backend.busbooking.dto.request.MaintenanceRequest;
import com.travelease.backend.busbooking.dto.request.MaintenanceStatusTransitionRequest;
import com.travelease.backend.busbooking.dto.request.StaffRequest;
import com.travelease.backend.busbooking.dto.request.TripAssignmentRequest;
import com.travelease.backend.busbooking.dto.request.TripStatusTransitionRequest;
import com.travelease.backend.busbooking.dto.response.*;
import com.travelease.backend.busbooking.entity.enums.MaintenanceStatus;
import com.travelease.backend.busbooking.entity.enums.StaffStatus;
import com.travelease.backend.busbooking.entity.enums.StaffType;
import com.travelease.backend.busbooking.entity.enums.TripStatus;
import com.travelease.backend.busbooking.service.BusService;
import com.travelease.backend.busbooking.service.MaintenanceService;
import com.travelease.backend.busbooking.service.ScheduleService;
import com.travelease.backend.busbooking.service.StaffService;
import com.travelease.backend.busbooking.service.TripService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/operations")
@RequiredArgsConstructor
@Tag(name = "Fleet Operations", description = "Transport provider operations: drivers, conductors, maintenance, trips")
public class FleetOperationController {

    private final StaffService staffService;
    private final MaintenanceService maintenanceService;
    private final TripService tripService;
    private final BusService busService;
    private final ScheduleService scheduleService;
    private final com.travelease.backend.busbooking.security.SecurityUtil securityUtil;

    // ==================== STAFF MANAGEMENT ====================

    @GetMapping("/staff")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Get staff with optional filters", description = "Get staff with optional filters")
    public ResponseEntity<ApiResponse<List<StaffResponse>>> getAllStaff(
            @RequestParam(required = false) Long providerId,
            @RequestParam(required = false) StaffType staffType,
            @RequestParam(required = false) StaffStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        Long effectiveProviderId = securityUtil.resolveEffectiveProviderId(providerId);
        List<StaffResponse> response = staffService.getStaff(effectiveProviderId, staffType, status, pageable);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Staff fetched successfully", response, "/api/operations/staff"));
    }

    @GetMapping("/staff/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Get staff by ID", description = "Get staff by ID")
    public ResponseEntity<ApiResponse<StaffResponse>> getStaffById(@PathVariable Long id) {
        assertOwnsStaff(id);
        StaffResponse response = staffService.getStaffById(id);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Staff fetched successfully", response, "/api/operations/staff/" + id));
    }

    @PostMapping("/staff")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Create staff", description = "Create staff")
    public ResponseEntity<ApiResponse<StaffResponse>> createStaff(@Valid @RequestBody StaffRequest request) {
        request.setProviderId(securityUtil.resolveEffectiveProviderId(request.getProviderId()));
        StaffResponse response = staffService.createStaff(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(HttpStatus.CREATED.value(), "Staff created successfully", response, "/api/operations/staff"));
    }

    @PutMapping("/staff/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Update staff", description = "Update staff")
    public ResponseEntity<ApiResponse<StaffResponse>> updateStaff(@PathVariable Long id, @Valid @RequestBody StaffRequest request) {
        assertOwnsStaff(id);
        request.setProviderId(securityUtil.resolveEffectiveProviderId(request.getProviderId()));
        StaffResponse response = staffService.updateStaff(id, request);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Staff updated successfully", response, "/api/operations/staff/" + id));
    }

    @DeleteMapping("/staff/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Deactivate staff", description = "Deactivate staff")
    public ResponseEntity<ApiResponse<MessageResponse>> deactivateStaff(@PathVariable Long id) {
        assertOwnsStaff(id);
        staffService.deactivateStaff(id);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Staff deactivated successfully", new MessageResponse("Staff deactivated successfully"), "/api/operations/staff/" + id));
    }

    // ==================== MAINTENANCE MANAGEMENT ====================

    @GetMapping("/maintenance")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Get maintenance records with optional filters", description = "Get maintenance records with optional filters")
    public ResponseEntity<ApiResponse<List<MaintenanceResponse>>> getMaintenanceRecords(
            @RequestParam(required = false) Long busId,
            @RequestParam(required = false) MaintenanceStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        if (busId != null) {
            assertOwnsBus(busId);
        }
        Long effectiveProviderId = securityUtil.resolveEffectiveProviderId(null);
        List<MaintenanceResponse> response = maintenanceService.getMaintenanceRecords(effectiveProviderId, busId, status, pageable);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Maintenance records fetched successfully", response, "/api/operations/maintenance"));
    }

    @GetMapping("/maintenance/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Get maintenance record by ID", description = "Get maintenance record by ID")
    public ResponseEntity<ApiResponse<MaintenanceResponse>> getMaintenanceById(@PathVariable Long id) {
        assertOwnsMaintenance(id);
        MaintenanceResponse response = maintenanceService.getMaintenanceById(id);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Maintenance record fetched successfully", response, "/api/operations/maintenance/" + id));
    }

    @PostMapping("/maintenance")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Schedule maintenance", description = "Schedule maintenance")
    public ResponseEntity<ApiResponse<MaintenanceResponse>> scheduleMaintenance(@Valid @RequestBody MaintenanceRequest request) {
        assertOwnsBus(request.getBusId());
        MaintenanceResponse response = maintenanceService.scheduleMaintenance(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(HttpStatus.CREATED.value(), "Maintenance scheduled successfully", response, "/api/operations/maintenance"));
    }

    @PutMapping("/maintenance/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Update maintenance record", description = "Update maintenance record")
    public ResponseEntity<ApiResponse<MaintenanceResponse>> updateMaintenance(@PathVariable Long id, @Valid @RequestBody MaintenanceRequest request) {
        // Ownership is asserted against the maintenance record's actual bus (not
        // request.getBusId()): MaintenanceServiceImpl.updateMaintenance never
        // reassigns the bus, so trusting the request body's busId here would let a
        // provider pass a busId they own while editing a record that actually
        // belongs to someone else's bus.
        assertOwnsMaintenance(id);
        MaintenanceResponse response = maintenanceService.updateMaintenance(id, request);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Maintenance record updated successfully", response, "/api/operations/maintenance/" + id));
    }

    @PatchMapping("/maintenance/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Transition maintenance status (start/complete/cancel)", description = "Transition maintenance status (start/complete/cancel)")
    public ResponseEntity<ApiResponse<MaintenanceResponse>> transitionMaintenanceStatus(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceStatusTransitionRequest request) {
        assertOwnsMaintenance(id);
        MaintenanceResponse response = maintenanceService.transitionMaintenance(id, request);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Maintenance status updated successfully", response, "/api/operations/maintenance/" + id + "/status"));
    }

    @GetMapping("/maintenance/bus/{busId}/cost")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Get total maintenance cost by bus", description = "Get total maintenance cost by bus")
    public ResponseEntity<ApiResponse<Double>> getTotalMaintenanceCost(@PathVariable Long busId) {
        assertOwnsBus(busId);
        Double cost = maintenanceService.getTotalMaintenanceCost(busId);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Total maintenance cost fetched successfully", cost, "/api/operations/maintenance/bus/" + busId + "/cost"));
    }

    // ==================== TRIP OPERATIONS ====================

    @GetMapping("/trips")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Get trips with optional filters", description = "Get trips with optional filters")
    public ResponseEntity<ApiResponse<List<TripResponse>>> getTrips(
            @RequestParam(required = false) Long scheduleId,
            @RequestParam(required = false) Long driverId,
            @RequestParam(required = false) Long conductorId,
            @RequestParam(required = false) TripStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        if (scheduleId != null) {
            assertOwnsSchedule(scheduleId);
        }
        List<TripResponse> response = tripService.getTrips(scheduleId, driverId, conductorId, status, pageable);
        // TripService has no providerId-based filter to scope the query by, so
        // regardless of which optional filters were supplied, post-filter the
        // result to the caller's own provider when they are a PROVIDER (not ADMIN)
        // to prevent cross-tenant data exposure.
        if (securityUtil.getCurrentUserRoles().contains("ROLE_PROVIDER")) {
            Long currentProviderId = securityUtil.getCurrentProviderId();
            response = response.stream()
                    .filter(t -> currentProviderId.equals(t.getProviderId()))
                    .toList();
        }
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Trips fetched successfully", response, "/api/operations/trips"));
    }

    @GetMapping("/trips/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Get trip by ID", description = "Get trip by ID")
    public ResponseEntity<ApiResponse<TripResponse>> getTripById(@PathVariable Long id) {
        assertOwnsTrip(id);
        TripResponse response = tripService.getTripById(id);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Trip fetched successfully", response, "/api/operations/trips/" + id));
    }

    @PostMapping("/trips/assign")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Assign trip", description = "Assign trip")
    public ResponseEntity<ApiResponse<TripResponse>> assignTrip(@Valid @RequestBody TripAssignmentRequest request) {
        assertOwnsSchedule(request.getScheduleId());
        TripResponse response = tripService.assignTrip(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(HttpStatus.CREATED.value(), "Trip assigned successfully", response, "/api/operations/trips/assign"));
    }

    @PatchMapping("/trips/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Transition trip status (boarding/depart/running/delayed/arrived/complete/cancel)", description = "Transition trip status (boarding/depart/running/delayed/arrived/complete/cancel)")
    public ResponseEntity<ApiResponse<TripResponse>> transitionTripStatus(
            @PathVariable Long id,
            @Valid @RequestBody TripStatusTransitionRequest request) {
        assertOwnsTrip(id);
        TripResponse response = tripService.transitionTrip(id, request);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Trip status updated successfully", response, "/api/operations/trips/" + id + "/status"));
    }

    // ==================== FLEET AVAILABILITY ====================

    @GetMapping("/fleet/availability/{providerId}")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Get fleet availability by provider", description = "Get fleet availability by provider")
    public ResponseEntity<ApiResponse<FleetAvailabilityResponse>> getFleetAvailability(@PathVariable Long providerId) {
        Long effectiveProviderId = securityUtil.resolveEffectiveProviderId(providerId);
        FleetAvailabilityResponse response = tripService.getFleetAvailability(effectiveProviderId);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Fleet availability fetched successfully", response, "/api/operations/fleet/availability/" + providerId));
    }

    // ==================== OWNERSHIP HELPERS ====================

    private void assertOwnsBus(Long busId) {
        securityUtil.resolveEffectiveProviderId(busService.getBusById(busId).getProviderId());
    }

    private void assertOwnsStaff(Long staffId) {
        securityUtil.resolveEffectiveProviderId(staffService.getStaffById(staffId).getProviderId());
    }

    private void assertOwnsMaintenance(Long maintenanceId) {
        assertOwnsBus(maintenanceService.getMaintenanceById(maintenanceId).getBusId());
    }

    private void assertOwnsSchedule(Long scheduleId) {
        ScheduleResponse existing = scheduleService.getScheduleById(scheduleId);
        securityUtil.resolveEffectiveProviderId(existing.getBus().getProviderId());
    }

    private void assertOwnsTrip(Long tripId) {
        securityUtil.resolveEffectiveProviderId(tripService.getTripById(tripId).getProviderId());
    }
}

