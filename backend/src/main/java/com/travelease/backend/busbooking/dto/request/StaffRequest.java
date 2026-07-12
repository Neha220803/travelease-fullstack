package com.travelease.backend.busbooking.dto.request;

import com.travelease.backend.busbooking.entity.enums.StaffStatus;
import com.travelease.backend.busbooking.entity.enums.StaffType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StaffRequest {

    @NotNull(message = "Provider ID is required")
    private Long providerId;

    @NotBlank(message = "Staff name is required")
    private String name;

    @NotNull(message = "Staff type is required")
    private StaffType staffType;

    // Required when staffType == DRIVER, ignored otherwise — enforced in
    // StaffServiceImpl since Bean Validation can't express "required if X"
    // declaratively here.
    private String licenseNumber;

    // Required when staffType != DRIVER, ignored otherwise.
    private String employeeId;

    private String phone;
    private String email;

    // Optional: when present and different from the staff member's current
    // status, updateStaff applies the transition. Lets PUT /staff/{id} subsume
    // a separate status-PATCH endpoint.
    private StaffStatus status;
}
