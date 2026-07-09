import { DRIVER_STATUSES, REPORT_TYPES, TRIP_STATUSES } from '@app/features/transport/services/transport-enums';

describe('transport-enums', () => {
  it('lists exactly the 5 backend DriverStatus values in enum declaration order', () => {
    expect(DRIVER_STATUSES).toEqual(['AVAILABLE', 'ASSIGNED', 'ON_TRIP', 'OFF_DUTY', 'LEAVE']);
  });

  it('lists exactly the 8 backend TripStatus values in enum declaration order', () => {
    expect(TRIP_STATUSES).toEqual([
      'SCHEDULED', 'BOARDING', 'DEPARTED', 'RUNNING', 'DELAYED', 'ARRIVED', 'COMPLETED', 'CANCELLED',
    ]);
  });

  it('lists exactly the 11 backend ReportType values in enum declaration order', () => {
    expect(REPORT_TYPES).toEqual([
      'BOOKING', 'REVENUE', 'PASSENGER', 'BUS_PERFORMANCE', 'ROUTE_PERFORMANCE',
      'DRIVER_PERFORMANCE', 'CONDUCTOR_PERFORMANCE', 'FLEET_UTILIZATION', 'MAINTENANCE', 'REFUND', 'CANCELLATION',
    ]);
  });
});
