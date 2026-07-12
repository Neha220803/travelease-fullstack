import { ScheduleStatus } from '@app/features/transport/services/transport-enums';
import { BusResponse } from '@app/features/transport/services/bus.models';
import { RouteReferenceResponse } from '@app/features/transport/services/route-reference.models';

export interface ScheduleResponse {
  id: number;
  bus: BusResponse;
  route: RouteReferenceResponse;
  travelDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  fare: number;
  availableSeats: number;
  status: ScheduleStatus;
}

export interface ScheduleFormPayload {
  busId: number;
  routeId: number;
  travelDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  fare: number;
}
