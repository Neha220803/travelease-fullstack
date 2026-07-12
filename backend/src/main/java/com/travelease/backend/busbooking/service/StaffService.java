package com.travelease.backend.busbooking.service;

import com.travelease.backend.busbooking.dto.request.StaffRequest;
import com.travelease.backend.busbooking.dto.response.StaffResponse;
import com.travelease.backend.busbooking.entity.enums.StaffStatus;
import com.travelease.backend.busbooking.entity.enums.StaffType;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface StaffService {

    StaffResponse createStaff(StaffRequest request);

    StaffResponse updateStaff(Long id, StaffRequest request);

    StaffResponse getStaffById(Long id);

    List<StaffResponse> getStaff(Long providerId, StaffType staffType, StaffStatus status, Pageable pageable);

    void deactivateStaff(Long id);
}
