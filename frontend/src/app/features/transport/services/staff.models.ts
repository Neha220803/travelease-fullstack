import { ConductorStatus, DriverStatus } from '@app/features/transport/services/transport-enums';

export interface DriverResponse {
  id: number;
  providerId: number;
  name: string;
  licenseNumber: string;
  phone: string | null;
  email: string | null;
  status: DriverStatus;
  totalTrips: number;
  totalDistanceKm: number;
  rating: number;
  active: boolean;
  createdAt: string;
}

export interface ConductorResponse {
  id: number;
  providerId: number;
  name: string;
  employeeId: string;
  phone: string | null;
  email: string | null;
  status: ConductorStatus;
  totalTrips: number;
  rating: number;
  active: boolean;
  createdAt: string;
}

/** Create form: no status field — the backend never maps it on create. */
export interface DriverCreatePayload {
  name: string;
  licenseNumber: string;
  phone?: string;
  email?: string;
}

/** Edit form: no licenseNumber — updateDriver never touches it. */
export interface DriverEditPayload {
  name: string;
  phone?: string;
  email?: string;
  status: DriverStatus;
}

export interface ConductorCreatePayload {
  name: string;
  employeeId: string;
  phone?: string;
  email?: string;
}

export interface ConductorEditPayload {
  name: string;
  phone?: string;
  email?: string;
  status: ConductorStatus;
}
