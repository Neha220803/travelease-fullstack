export type DelayReason =
  | 'WEATHER'
  | 'TRAFFIC'
  | 'MECHANICAL'
  | 'HEALTH'
  | 'PERSONAL'
  | 'OTHER';

export interface Delay {
  id: string;
  tripId: string;
  reportedAt: string;
  durationMinutes: number;
  reason: DelayReason;
  notes?: string;
}

export interface DelayImpact {
  delayId: string;
  affectedActivities: {
    activityId: string;
    activityName: string;
    scheduledTime: string;
    impactType: 'MISSED' | 'LATE' | 'RESCHEDULABLE';
  }[];
}

export interface RescheduleSuggestion {
  id: string;
  delayId: string;
  activityId: string;
  activityName: string;
  newDate: string;
  newTime: string;
  description: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Recommendation {
  tripId: string;
  hotels: import('./hotel.model').Hotel[];
  attractions: import('./activity.model').Attraction[];
  activities: import('./activity.model').Activity[];
}
