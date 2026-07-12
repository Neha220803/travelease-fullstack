package com.travelease.backend.busbooking.dto.response;

import com.travelease.backend.busbooking.entity.enums.StaffStatus;
import com.travelease.backend.busbooking.entity.enums.StaffType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffResponse {

    private Long id;
    private Long providerId;
    private String name;
    private StaffType staffType;
    private String licenseNumber;
    private String employeeId;
    private String phone;
    private String email;
    private StaffStatus status;
    private Integer totalTrips;
    private Double totalDistanceKm;
    private Double rating;
    private Boolean active;
    private LocalDateTime createdAt;
}
