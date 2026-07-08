export interface BusSearchResult {
  scheduleId: number;
  busName: string;
  busNumber: string;
  busType: string;
  source: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  fare: number;
  availableSeats: number;
  duration: number;
  travelDate: string;
  amenities: string[];
}

export type BusBookingStatus =
  | 'PENDING'
  | 'RESERVED'
  | 'CONFIRMED'
  | 'FAILED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'EXPIRED';

export interface TripBusBooking {
  bookingId: number;
  bookingReference: string;
  status: BusBookingStatus;
  totalFare: number;
  scheduleId: number;
  travelDate: string;
  source: string;
  destination: string;
  bookedByUserId: string;
  travelerTripId: string;
}

export interface TripBusBookingSummary {
  tripId: string;
  bookingCount: number;
  totalFare: number;
  bookings: TripBusBooking[];
}
