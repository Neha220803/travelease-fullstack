package com.travelease.backend.auth.service;

import com.travelease.backend.auth.dto.AdminCreateUserRequest;
import com.travelease.backend.auth.dto.PartnerRegisterRequest;
import com.travelease.backend.auth.dto.PendingPartnerResponse;
import com.travelease.backend.auth.dto.RegisterRequest;
import com.travelease.backend.auth.dto.UserResponse;
import com.travelease.backend.auth.entity.User;

import java.util.List;
import java.util.UUID;

public interface UserService {

    UserResponse register(RegisterRequest request);

    List<UserResponse> listUsers();

    UserResponse createByAdmin(AdminCreateUserRequest request);

    UserResponse registerPartner(PartnerRegisterRequest request);

    List<PendingPartnerResponse> listPendingPartners();

    UserResponse approvePartner(UUID id);

    UserResponse rejectPartner(UUID id);

    boolean verifySecurityAnswer(String email, String answer);

    User getByEmail(String email);

    List<UserResponse> searchTravelers(String query);

    User updateProfile(String email, String name, String phone);

    void changePassword(String email, String securityAnswer, String newPassword);
}
