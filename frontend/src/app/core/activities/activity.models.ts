export interface Activity {
  activityId: string;
  providerId: number;
  destinationId: number;
  activityName: string;
  durationHours: number;
  startTime: string;
  endTime: string;
  description: string;
}

export interface ActivityProviderOption {
  providerId: number;
  providerName: string;
}
