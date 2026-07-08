package com.travelease.backend.auth.service;

import com.travelease.backend.auth.dto.AdminCreateUserRequest;
import com.travelease.backend.auth.dto.RegisterRequest;
import com.travelease.backend.auth.dto.UserResponse;
import com.travelease.backend.auth.entity.User;

import java.util.List;

public interface UserService {

    UserResponse register(RegisterRequest request);

    List<UserResponse> listUsers();

    UserResponse createByAdmin(AdminCreateUserRequest request);

    boolean verifySecurityAnswer(String email, String answer);

    User getByEmail(String email);

    List<UserResponse> searchTravelers(String query);
}
