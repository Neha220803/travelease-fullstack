package com.travelease.backend.busbooking.controller;

import com.travelease.backend.busbooking.dto.request.BusRequest;
import com.travelease.backend.busbooking.dto.response.ApiResponse;
import com.travelease.backend.busbooking.dto.response.BusResponse;
import com.travelease.backend.busbooking.dto.response.MessageResponse;
import com.travelease.backend.busbooking.entity.enums.BusStatus;
import com.travelease.backend.busbooking.security.SecurityUtil;
import com.travelease.backend.busbooking.service.BusService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/buses")
@RequiredArgsConstructor
@Tag(name = "Bus Management", description = "Bus fleet management for ROLE_PROVIDER (Transport/Bus Provider "
        + "only - not Hotel or Activity Provider). Tenant-isolated by transport providerId (User.providerId -> "
        + "Bus.providerId); Provider 1 can never read or mutate Provider 2's buses.")
public class BusController {

    private final BusService busService;
    private final SecurityUtil securityUtil;

    @GetMapping
    @Operation(summary = "Get buses with optional filters", description = "ACCESS: PUBLIC (SecurityConfig "
            + "permits GET /api/buses/** without a JWT).\n\n"
            + "SCOPE: Read-only catalog search; the providerId filter is a free-form query param, not "
            + "identity-restricted.")
    public ResponseEntity<ApiResponse<List<BusResponse>>> getBuses(
            @RequestParam(required = false) Long providerId,
            @RequestParam(required = false) BusStatus status) {
        List<BusResponse> response = busService.getBuses(providerId, status);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Buses fetched successfully", response, "/api/buses"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get bus by ID", description = "ACCESS: PUBLIC (no JWT required).\n\n"
            + "SCOPE: Read-only, not tenant-scoped.")
    public ResponseEntity<ApiResponse<BusResponse>> getBusById(@PathVariable Long id) {
        BusResponse response = busService.getBusById(id);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Bus fetched successfully", response, "/api/buses/" + id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Create a new bus", description = "ACCESS: ROLE_PROVIDER (transport) or ROLE_ADMIN.\n\n"
            + "SCOPE: ROLE_PROVIDER is always assigned its own providerId server-side; a client-supplied "
            + "providerId is only honored for ROLE_ADMIN.\n\n"
            + "IDENTITY: Effective providerId resolved and validated server-side via "
            + "SecurityUtil.resolveEffectiveProviderId.\n\n"
            + "TEST NOTE: Login as provider1@travelease.com (providerId 1) or provider2@travelease.com "
            + "(providerId 2).")
    public ResponseEntity<ApiResponse<BusResponse>> createBus(@Valid @RequestBody BusRequest request) {
        request.setProviderId(securityUtil.resolveEffectiveProviderId(request.getProviderId()));
        BusResponse response = busService.createBus(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(HttpStatus.CREATED.value(), "Bus created successfully", response, "/api/buses"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Update bus by ID", description = "ACCESS: ROLE_PROVIDER (transport) or ROLE_ADMIN.\n\n"
            + "SCOPE: Owning transport provider only (tenant-isolated by Bus.providerId); ROLE_ADMIN bypasses. "
            + "Another provider's bus id returns 403.")
    public ResponseEntity<ApiResponse<BusResponse>> updateBus(@PathVariable Long id,
                                                               @Valid @RequestBody BusRequest request) {
        assertOwnsBus(id);
        request.setProviderId(securityUtil.resolveEffectiveProviderId(request.getProviderId()));
        BusResponse response = busService.updateBus(id, request);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Bus updated successfully", response, "/api/buses/" + id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER')")
    @Operation(summary = "Soft delete bus by ID", description = "ACCESS: ROLE_PROVIDER (transport) or ROLE_ADMIN.\n\n"
            + "SCOPE: Owning transport provider only, same tenant isolation as update above; ROLE_ADMIN bypasses.")
    public ResponseEntity<ApiResponse<MessageResponse>> deleteBus(@PathVariable Long id) {
        assertOwnsBus(id);
        busService.deleteBus(id);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Bus deleted successfully", new MessageResponse("Bus deleted successfully"), "/api/buses/" + id));
    }

    private void assertOwnsBus(Long busId) {
        securityUtil.resolveEffectiveProviderId(busService.getBusById(busId).getProviderId());
    }
}

