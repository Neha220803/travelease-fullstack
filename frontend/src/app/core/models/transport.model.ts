export type TransportType = 'BUS' | 'TRAIN' | 'FLIGHT' | 'CAR' | 'FERRY' | 'METRO';
export type TransportBookingStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED';

export interface Transport {
  id: string;
  providerId?: string;
  type: TransportType;
  name: string;
  vehicleNumber: string;
  route: string;
  sourceCity: string;
  destinationCity: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: number;
  amenities: string[];
}

export interface TransportBooking {
  id: string;
  tripId: string;
  transportId: string;
  transportName: string;
  transportType: TransportType;
  route: string;
  departureTime: string;
  arrivalTime: string;
  seatNumbers?: string[];
  passengerCount: number;
  totalAmount: number;
  status: TransportBookingStatus;
  createdAt: string;
}

export interface TransportRoute {
  id: string;
  sourceCity: string;
  destinationCity: string;
  distanceKm: number;
  popularModes: TransportType[];
}

export interface Vehicle {
  id: string;
  type: TransportType;
  vehicleNumber: string;
  capacity: number;
  amenities: string[];
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  lastMaintenanceDate: string;
}
