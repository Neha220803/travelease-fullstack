package com.travelease.backend.expense.entity;

/**
 * PENDING -> FINALIZED  (every participant approved their share)
 * PENDING -> REJECTED   (any single participant rejected their share)
 * FINALIZED / REJECTED are terminal - no further approve/reject calls accepted.
 */
public enum ExpenseStatus {
    PENDING,
    FINALIZED,
    REJECTED
}
