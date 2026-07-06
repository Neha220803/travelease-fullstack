export type NotificationType =
  | 'TRIP_INVITATION'
  | 'INVITATION_ACCEPTED'
  | 'INVITATION_REJECTED'
  | 'ACTIVITY_REMINDER'
  | 'DEPARTURE_ALERT'
  | 'EXPENSE_ADDED'
  | 'SETTLEMENT_PAID'
  | 'DELAY_REPORTED'
  | 'SYSTEM';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  tripId?: string;
  tripName?: string;
  createdAt: string;
}

export interface DepartureSuggestion {
  id: string;
  tripId: string;
  tripName: string;
  activityName: string;
  activityTime: string;
  suggestedDepartureTime: string;
  travelDurationMinutes: number;
  message: string;
}
