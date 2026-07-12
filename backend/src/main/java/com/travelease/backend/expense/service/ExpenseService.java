package com.travelease.backend.expense.service;

import com.travelease.backend.expense.dto.CreateExpenseRequest;
import com.travelease.backend.expense.dto.ExpenseResponse;
import com.travelease.backend.shared.dto.PagedResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface ExpenseService {

    ExpenseResponse createSharedExpense(UUID tripId, CreateExpenseRequest request, String currentUserEmail);

    List<ExpenseResponse> getTripExpenses(UUID tripId, String currentUserEmail);

    PagedResponse<ExpenseResponse> getTripExpensesPaged(UUID tripId, String currentUserEmail, Pageable pageable);

    ExpenseResponse getTripExpense(UUID tripId, UUID expenseId, String currentUserEmail);
}

