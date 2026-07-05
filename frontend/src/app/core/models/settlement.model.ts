export type SettlementStatus = 'PENDING' | 'PAID';

export interface Settlement {
  id: string;
  tripId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  status: SettlementStatus;
  paidAt?: string;
  createdAt: string;
}

export interface SettlementSummary {
  tripId: string;
  totalOwed: number;
  totalOwedToMe: number;
  netBalance: number;
  settlements: Settlement[];
}
