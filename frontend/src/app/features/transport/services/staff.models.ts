import { StaffStatus, StaffType } from '@app/features/transport/services/transport-enums';

export interface StaffResponse {
  id: number;
  providerId: number;
  name: string;
  staffType: StaffType;
  licenseNumber: string | null;
  employeeId: string | null;
  phone: string | null;
  email: string | null;
  status: StaffStatus;
  totalTrips: number;
  totalDistanceKm: number;
  rating: number;
  active: boolean;
  createdAt: string;
}

/** Create form: no status field — the backend never maps it on create. */
export interface StaffCreatePayload {
  name: string;
  staffType: StaffType;
  licenseNumber?: string;
  employeeId?: string;
  phone?: string;
  email?: string;
}

/** Edit form: no staffType/licenseNumber/employeeId — updateStaff never touches them. */
export interface StaffEditPayload {
  name: string;
  phone?: string;
  email?: string;
  status: StaffStatus;
}
