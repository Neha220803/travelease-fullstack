import { TripStatus } from '@app/features/transport/services/transport-enums';

export interface TripResponse {
  id: number;
  scheduleId: number;
  routeId: number;
  providerId: number;
  busId: number;
  busNumber: string;
  busName: string;
  driverId: number | null;
  driverName: string | null;
  driverLicense: string | null;
  conductorId: number | null;
  conductorName: string | null;
  status: TripStatus;
  actualDepartureTime: string | null;
  actualArrivalTime: string | null;
  delayMinutes: number;
  distanceCoveredKm: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripAssignmentPayload {
  scheduleId: number;
  driverId?: number;
  conductorId?: number;
  notes?: string;
}

export interface TripTransitionPayload {
  status: TripStatus;
  delayMinutes?: number;
  distanceCoveredKm?: number;
  reason?: string;
}

export interface FleetAvailabilityResponse {
  providerId: number;
  totalBuses: number;
  activeBuses: number;
  maintenanceBuses: number;
  inactiveBuses: number;
  availableDrivers: number;
  availableConductors: number;
  activeTrips: number;
  scheduledTrips: number;
}
