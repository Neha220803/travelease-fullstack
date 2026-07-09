import { MaintenanceStatus } from '@app/features/transport/services/transport-enums';

export const SUGGESTED_MAINTENANCE_TYPES = ['OIL_CHANGE', 'TIRE_ROTATION', 'ENGINE_REPAIR', 'BRAKE_SERVICE', 'AC_SERVICE'];

export interface MaintenanceResponse {
  id: number;
  busId: number;
  busNumber: string;
  maintenanceType: string;
  description: string | null;
  status: MaintenanceStatus;
  scheduledDate: string;
  completedDate: string | null;
  cost: number;
  nextMaintenanceDate: string | null;
  performedBy: string | null;
  createdAt: string;
}

export interface MaintenanceFormPayload {
  busId: number;
  maintenanceType: string;
  description?: string;
  scheduledDate: string;
  estimatedCost?: number;
  nextMaintenanceDate?: string;
  performedBy?: string;
}

export interface MaintenanceTransitionPayload {
  status: MaintenanceStatus;
  cost?: number;
  completedDate?: string;
}
