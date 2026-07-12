package com.travelease.backend.busbooking.mapper;

import com.travelease.backend.busbooking.dto.request.StaffRequest;
import com.travelease.backend.busbooking.dto.response.StaffResponse;
import com.travelease.backend.busbooking.entity.Staff;
import org.springframework.stereotype.Component;

@Component
public class StaffMapper {

    public StaffResponse toResponse(Staff staff) {
        return StaffResponse.builder()
                .id(staff.getId())
                .providerId(staff.getProviderId())
                .name(staff.getName())
                .staffType(staff.getStaffType())
                .licenseNumber(staff.getLicenseNumber())
                .employeeId(staff.getEmployeeId())
                .phone(staff.getPhone())
                .email(staff.getEmail())
                .status(staff.getStatus())
                .totalTrips(staff.getTotalTrips())
                .totalDistanceKm(staff.getTotalDistanceKm())
                .rating(staff.getRating())
                .active(staff.getActive())
                .createdAt(staff.getCreatedAt())
                .build();
    }

    public Staff toEntity(StaffRequest request) {
        return Staff.builder()
                .providerId(request.getProviderId())
                .name(request.getName())
                .staffType(request.getStaffType())
                .licenseNumber(request.getLicenseNumber())
                .employeeId(request.getEmployeeId())
                .phone(request.getPhone())
                .email(request.getEmail())
                .build();
    }
}
