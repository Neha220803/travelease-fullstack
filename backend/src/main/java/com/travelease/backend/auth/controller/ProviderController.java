package com.travelease.backend.auth.controller;

import com.travelease.backend.auth.dto.ProviderDto;
import com.travelease.backend.auth.entity.Role;
import com.travelease.backend.auth.repository.ProviderRepository;
import com.travelease.backend.shared.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/providers")
@RequiredArgsConstructor
public class ProviderController {

    private final ProviderRepository providerRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProviderDto>>> getProviders(@RequestParam(required = false) Role type) {
        List<ProviderDto> providers = (type != null ? providerRepository.findByType(type) : providerRepository.findAll())
                .stream()
                .map(p -> new ProviderDto(p.getId(), p.getBusinessName(), p.getType().name()))
                .toList();
        return ResponseEntity.ok(ApiResponse.success(providers, "Providers retrieved"));
    }
}
