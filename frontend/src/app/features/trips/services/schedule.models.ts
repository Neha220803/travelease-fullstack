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

export type SeatStatus = 'AVAILABLE' | 'BLOCKED' | 'BOOKED' | 'LOCKED';

export type SeatType = 'SEATER' | 'SEMI_SLEEPER' | 'SLEEPER';

export interface SeatResponse {
  id: number;
  seatNumber: string;
  seatType: SeatType;
  deck: number;
  status: SeatStatus;
}

export interface SeatLayoutResponse {
  busId: number;
  busName: string;
  seats: SeatResponse[];
}

export interface PassengerDetailDto {
  seatId: number;
  passengerName: string;
  passengerAge: number;
  passengerGender: string;
  passengerEmail?: string;
  passengerPhone?: string;
  isPrimary?: boolean;
}

export interface BookingRequest {
  scheduleId: number;
  seatIds: number[];
  passengerDetails: PassengerDetailDto[];
  couponCode?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface BookingResponse {
  bookingId: number;
  bookingReference: string;
  status: BusBookingStatus;
  totalFare: number;
}

export interface AttachBusBookingRequest {
  bookingId: number;
}
