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
 * startTime/endTime are optional ISO-8601 local date-times (e.g.
 * '2026-07-20T18:00:00'), only meaningful alongside activityId.
 */
export interface CreateItineraryPayload {
  tripId: string;
  activityId?: string;
  activityName?: string;
  activityDate: string;
  startTime?: string;
  endTime?: string;
  status: ItineraryStatus;
}

export interface ItineraryProgress {
  tripId: string;
  totalActivities: number;
  completedActivities: number;
  pendingActivities: number;
  completionPercentage: number;
}
