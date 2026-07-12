package com.travelease.backend.busbooking.repository;

import com.travelease.backend.busbooking.entity.Staff;
import com.travelease.backend.busbooking.entity.enums.StaffStatus;
import com.travelease.backend.busbooking.entity.enums.StaffType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StaffRepository extends JpaRepository<Staff, Long>, JpaSpecificationExecutor<Staff> {

    List<Staff> findByProviderIdAndActiveTrue(Long providerId);

    List<Staff> findByProviderIdAndStaffTypeAndActiveTrue(Long providerId, StaffType staffType);

    List<Staff> findByStatusAndActiveTrue(StaffStatus status);

    Optional<Staff> findByLicenseNumber(String licenseNumber);

    boolean existsByLicenseNumber(String licenseNumber);

    Optional<Staff> findByEmployeeId(String employeeId);

    boolean existsByEmployeeId(String employeeId);

    @Query("SELECT COUNT(s) FROM Staff s WHERE s.providerId = :providerId AND s.staffType = :staffType AND s.active = true")
    Long countActiveByProvider(@Param("providerId") Long providerId, @Param("staffType") StaffType staffType);

    @Query("SELECT s FROM Staff s WHERE s.providerId = :providerId AND s.staffType = :staffType AND s.status = 'AVAILABLE' AND s.active = true")
    List<Staff> findAvailableByProvider(@Param("providerId") Long providerId, @Param("staffType") StaffType staffType);
}
