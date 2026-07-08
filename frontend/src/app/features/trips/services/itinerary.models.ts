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

export interface CreateItineraryPayload {
  tripId: string;
  activityId: string;
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
