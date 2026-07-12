package com.travelease.backend.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * The business/tenant a hotel, transport, or activity provider account is scoped
 * to. Kept as a plain Long-keyed entity (not BaseEntity, which is UUID-keyed)
 * because every existing provider-scoped column (User.providerId, Hotel.providerId,
 * Bus.providerId, ...) is already typed Long throughout the codebase; switching
 * those to UUID would be a much larger, unrelated migration.
 */
@Getter
@Setter
@Entity
@Table(name = "providers")
public class Provider {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String businessName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role type;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
