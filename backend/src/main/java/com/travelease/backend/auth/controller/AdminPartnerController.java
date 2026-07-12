package com.travelease.backend.auth.controller;

import com.travelease.backend.auth.dto.AllPartnerResponse;
import com.travelease.backend.auth.dto.PendingPartnerResponse;
import com.travelease.backend.auth.dto.RejectPartnerRequest;
import com.travelease.backend.auth.dto.UserResponse;
import com.travelease.backend.auth.service.UserService;
import com.travelease.backend.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/partners")
@RequiredArgsConstructor
@Tag(name = "Admin Users", description = "Admin-only partner approval endpoints")
public class AdminPartnerController {

    private final UserService userService;

    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List pending partner applications", description = "ACCESS: ADMIN\nSCOPE: Returns provider-role accounts awaiting approval.")
    public ResponseEntity<ApiResponse<List<PendingPartnerResponse>>> listPending() {
        return ResponseEntity.ok(ApiResponse.success(userService.listPendingPartners(), "Pending partners retrieved"));
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List all partner applications", description = "ACCESS: ADMIN\nSCOPE: Returns all provider-role accounts with their approval status and rejection reason.")
    public ResponseEntity<ApiResponse<List<AllPartnerResponse>>> listAll() {
        return ResponseEntity.ok(ApiResponse.success(userService.listAllPartners(), "All partners retrieved"));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Approve a pending partner application", description = "ACCESS: ADMIN\nSCOPE: Sets the partner account status to APPROVED, allowing login.")
    public ResponseEntity<ApiResponse<UserResponse>> approve(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(userService.approvePartner(id), "Partner approved"));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Reject a pending partner application", description = "ACCESS: ADMIN\nSCOPE: Sets the partner account status to REJECTED, blocking login. Requires a rejection reason.")
    public ResponseEntity<ApiResponse<UserResponse>> reject(
            @PathVariable UUID id,
            @Valid @RequestBody RejectPartnerRequest request) {
        return ResponseEntity.ok(ApiResponse.success(userService.rejectPartner(id, request.reason()), "Partner rejected"));
    }
}
