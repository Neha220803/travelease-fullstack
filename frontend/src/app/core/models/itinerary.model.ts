export interface ItineraryActivity {
  id: string;
  itineraryId: string;
  activityId?: string;
  activityName: string;
  description?: string;
  date: string;
  startTime: string;
  endTime?: string;
  location?: string;
  category?: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
  cost?: number;
}

export interface Itinerary {
  id: string;
  tripId: string;
  title: string;
  activities: ItineraryActivity[];
  createdAt: string;
  updatedAt: string;
}
