package com.travelease.backend.auth.repository;

import com.travelease.backend.auth.entity.Provider;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProviderRepository extends JpaRepository<Provider, Long> {
}
