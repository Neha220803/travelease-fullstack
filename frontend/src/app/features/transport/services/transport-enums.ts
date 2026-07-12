export type DriverStatus = 'AVAILABLE' | 'ASSIGNED' | 'ON_TRIP' | 'OFF_DUTY' | 'LEAVE';
export const DRIVER_STATUSES: DriverStatus[] = ['AVAILABLE', 'ASSIGNED', 'ON_TRIP', 'OFF_DUTY', 'LEAVE'];

export type ConductorStatus = DriverStatus;
export const CONDUCTOR_STATUSES: ConductorStatus[] = DRIVER_STATUSES;

export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export const MAINTENANCE_STATUSES: MaintenanceStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export type BusStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export const BUS_STATUSES: BusStatus[] = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'];

export type ScheduleStatus = 'SCHEDULED' | 'DEPARTED' | 'ARRIVED' | 'CANCELLED';
export const SCHEDULE_STATUSES: ScheduleStatus[] = ['SCHEDULED', 'DEPARTED', 'ARRIVED', 'CANCELLED'];

export type TripStatus =
  | 'SCHEDULED' | 'BOARDING' | 'DEPARTED' | 'RUNNING' | 'DELAYED' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED';
export const TRIP_STATUSES: TripStatus[] = [
  'SCHEDULED', 'BOARDING', 'DEPARTED', 'RUNNING', 'DELAYED', 'ARRIVED', 'COMPLETED', 'CANCELLED',
];

export type RouteStatus = 'ACTIVE' | 'INACTIVE';
export const ROUTE_STATUSES: RouteStatus[] = ['ACTIVE', 'INACTIVE'];

export type BookingStatus = 'PENDING' | 'RESERVED' | 'CONFIRMED' | 'FAILED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
export const BOOKING_STATUSES: BookingStatus[] = [
  'PENDING', 'RESERVED', 'CONFIRMED', 'FAILED', 'CANCELLED', 'COMPLETED', 'EXPIRED',
];

export type ReportType =
  | 'BOOKING' | 'REVENUE' | 'PASSENGER' | 'BUS_PERFORMANCE' | 'ROUTE_PERFORMANCE'
  | 'DRIVER_PERFORMANCE' | 'CONDUCTOR_PERFORMANCE' | 'FLEET_UTILIZATION' | 'MAINTENANCE' | 'REFUND' | 'CANCELLATION';
export const REPORT_TYPES: ReportType[] = [
  'BOOKING', 'REVENUE', 'PASSENGER', 'BUS_PERFORMANCE', 'ROUTE_PERFORMANCE',
  'DRIVER_PERFORMANCE', 'CONDUCTOR_PERFORMANCE', 'FLEET_UTILIZATION', 'MAINTENANCE', 'REFUND', 'CANCELLATION',
];
