package com.travelease.backend.auth.repository;

import com.travelease.backend.auth.entity.Provider;
import org.springframework.data.jpa.repository.JpaRepository;

import com.travelease.backend.auth.entity.Role;
import java.util.List;

public interface ProviderRepository extends JpaRepository<Provider, Long> {
    List<Provider> findByType(Role type);
}
