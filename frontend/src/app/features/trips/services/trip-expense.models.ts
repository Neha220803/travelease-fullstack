// ── Expense ──────────────────────────────────────────────────────────

export interface ExpenseParticipantShareRequest {
  userId: string;
  shareAmount: number;
}

export interface CreateExpenseRequest {
  amount: number;
  category: string;
  description: string;
  expenseDate: string | null;
  payerId: string;
  participantIds: string[];
  participantShares: ExpenseParticipantShareRequest[] | null;
}

export interface ExpenseParticipantResponse {
  userId: string;
  name: string;
  shareAmount: number;
}

export interface ExpenseResponse {
  id: string;
  tripId: string;
  amount: number;
  category: string;
  expenseDate: string;
  description: string;
  payerId: string;
  payerName: string;
  participants: ExpenseParticipantResponse[];
  createdAt: string;
}

// ── Budget ───────────────────────────────────────────────────────────

export interface BudgetResponse {
  tripId: string;
  userId: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  utilizationPercentage: number;
  overspent: boolean;
}

export interface BudgetMemberSummaryResponse {
  userId: string;
  name: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  utilizationPercentage: number;
  overspent: boolean;
}

export interface BudgetSummaryResponse {
  tripId: string;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  utilizationPercentage: number;
  overspent: boolean;
  members: BudgetMemberSummaryResponse[];
}

// ── Settlement ───────────────────────────────────────────────────────

export type SettlementStatus = 'PENDING' | 'PAID';

export interface SettlementResponse {
  id: string;
  tripId: string;
  payerId: string;
  payerName: string;
  receiverId: string;
  receiverName: string;
  amount: number;
  status: SettlementStatus;
}

export interface SettlementSummaryResponse {
  tripId: string;
  totalPayable: number;
  totalReceivable: number;
  settlements: SettlementResponse[];
}

// ── Pagination ──────────────────────────────────────────────────────

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

