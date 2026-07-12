package com.travelease.backend.busbooking.service.impl;

import com.travelease.backend.busbooking.dto.request.StaffRequest;
import com.travelease.backend.busbooking.dto.response.StaffResponse;
import com.travelease.backend.busbooking.entity.Staff;
import com.travelease.backend.busbooking.entity.enums.StaffStatus;
import com.travelease.backend.busbooking.entity.enums.StaffType;
import com.travelease.backend.busbooking.exception.ResourceNotFoundException;
import com.travelease.backend.busbooking.mapper.StaffMapper;
import com.travelease.backend.busbooking.repository.StaffRepository;
import com.travelease.backend.busbooking.service.StaffService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StaffServiceImpl implements StaffService {

    private final StaffRepository staffRepository;
    private final StaffMapper staffMapper;

    @Override
    @Transactional
    public StaffResponse createStaff(StaffRequest request) {
        validateIdentifier(request.getStaffType(), request.getLicenseNumber(), request.getEmployeeId());

        if (request.getStaffType() == StaffType.DRIVER) {
            if (staffRepository.existsByLicenseNumber(request.getLicenseNumber())) {
                throw new IllegalArgumentException("Staff with license number " + request.getLicenseNumber() + " already exists");
            }
        } else if (staffRepository.existsByEmployeeId(request.getEmployeeId())) {
            throw new IllegalArgumentException("Staff with employee ID " + request.getEmployeeId() + " already exists");
        }

        Staff staff = staffMapper.toEntity(request);
        Staff saved = staffRepository.save(staff);
        return staffMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public StaffResponse updateStaff(Long id, StaffRequest request) {
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff not found with id: " + id));

        staff.setName(request.getName());
        staff.setPhone(request.getPhone());
        staff.setEmail(request.getEmail());

        if (request.getStatus() != null && request.getStatus() != staff.getStatus()) {
            staff.setStatus(request.getStatus());
        }

        Staff saved = staffRepository.save(staff);
        return staffMapper.toResponse(saved);
    }

    @Override
    public StaffResponse getStaffById(Long id) {
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff not found with id: " + id));
        return staffMapper.toResponse(staff);
    }

    @Override
    public List<StaffResponse> getStaff(Long providerId, StaffType staffType, StaffStatus status, Pageable pageable) {
        Specification<Staff> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (providerId != null) {
                predicates.add(cb.equal(root.get("providerId"), providerId));
            }
            if (staffType != null) {
                predicates.add(cb.equal(root.get("staffType"), staffType));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            predicates.add(cb.equal(root.get("active"), true));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return staffRepository.findAll(spec, pageable).stream()
                .map(staffMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deactivateStaff(Long id) {
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff not found with id: " + id));
        staff.setActive(false);
        staff.setStatus(StaffStatus.OFF_DUTY);
        staffRepository.save(staff);
    }

    private void validateIdentifier(StaffType staffType, String licenseNumber, String employeeId) {
        if (staffType == StaffType.DRIVER) {
            if (licenseNumber == null || licenseNumber.isBlank()) {
                throw new IllegalArgumentException("License number is required for drivers");
            }
        } else if (employeeId == null || employeeId.isBlank()) {
            throw new IllegalArgumentException("Employee ID is required for " + staffType);
        }
    }
}
