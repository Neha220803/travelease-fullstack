export type ExpenseCategory =
  | 'TRANSPORT'
  | 'ACCOMMODATION'
  | 'FOOD'
  | 'ACTIVITIES'
  | 'SHOPPING'
  | 'MEDICAL'
  | 'VISA'
  | 'INSURANCE'
  | 'OTHER';

export interface ExpenseParticipantShare {
  userId: string;
  userName?: string;
  shareAmount: number;
}

export interface Expense {
  id: string;
  tripId: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  expenseDate: string;
  payerId: string;
  payerName?: string;
  participantIds: string[];
  participantShares?: ExpenseParticipantShare[];
  splitType: 'EQUAL' | 'CUSTOM';
  createdAt: string;
}

export interface CreateExpenseRequest {
  amount: number;
  category: string;
  description: string;
  expenseDate?: string;
  payerId: string;
  participantIds: string[];
  participantShares?: ExpenseParticipantShare[];
}

export interface Budget {
  tripId: string;
  budgetAmount: number;
  myBudget?: number;
  mySpent?: number;
}

export interface BudgetSummary {
  tripId: string;
  budgetAmount: number;
  totalSpent: number;
  remaining: number;
  usagePercentage: number;
  isOverspent: boolean;
  categoryBreakdown?: { category: string; amount: number }[];
}
