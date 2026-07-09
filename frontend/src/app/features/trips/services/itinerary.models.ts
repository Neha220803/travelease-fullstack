export type ItineraryStatus = 'Pending' | 'Completed';

export interface ItineraryItem {
  itineraryId: string;
  tripId: string;
  activityId: string;
  activityName: string;
  activityDate: string;
  startTime: string | null;
  endTime: string | null;
  status: ItineraryStatus;
  completionTime: string | null;
}

/**
 * Either `activityId` (a provider-listed activity) or `activityName` (the
 * traveler's own free-text plan) must be set - never both, never neither.
 */
export interface CreateItineraryPayload {
  tripId: string;
  activityId?: string;
  activityName?: string;
  activityDate: string;
  status: ItineraryStatus;
}

export interface ItineraryProgress {
  tripId: string;
  totalActivities: number;
  completedActivities: number;
  pendingActivities: number;
  completionPercentage: number;
}
