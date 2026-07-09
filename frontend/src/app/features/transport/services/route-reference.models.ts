import { RouteStatus } from '@app/features/transport/services/transport-enums';

export interface RouteReferenceResponse {
  id: number;
  source: string;
  destination: string;
  distanceKm: number | null;
  durationHours: number | null;
  status: RouteStatus;
  createdAt: string;
}
