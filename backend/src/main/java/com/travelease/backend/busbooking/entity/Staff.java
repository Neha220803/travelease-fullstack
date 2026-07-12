package com.travelease.backend.busbooking.entity;

import com.travelease.backend.busbooking.entity.enums.StaffStatus;
import com.travelease.backend.busbooking.entity.enums.StaffType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "staff")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Staff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "provider_id", nullable = false)
    private Long providerId;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "staff_type", nullable = false)
    private StaffType staffType;

    // Required (and unique) for staffType == DRIVER; null otherwise.
    @Column(name = "license_number", unique = true)
    private String licenseNumber;

    // Required (and unique) for staffType != DRIVER; null otherwise.
    @Column(name = "employee_id", unique = true)
    private String employeeId;

    @Column
    private String phone;

    @Column
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StaffStatus status = StaffStatus.AVAILABLE;

    @Column(name = "total_trips")
    @Builder.Default
    private Integer totalTrips = 0;

    // Only meaningfully accumulated for staffType == DRIVER.
    @Column(name = "total_distance_km")
    @Builder.Default
    private Double totalDistanceKm = 0.0;

    @Column(name = "rating")
    @Builder.Default
    private Double rating = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
