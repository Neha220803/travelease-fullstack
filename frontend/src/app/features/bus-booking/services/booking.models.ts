export type BookingStatus = 'PENDING' | 'RESERVED' | 'CONFIRMED' | 'FAILED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export type RefundStatus = 'INITIATED' | 'PROCESSING' | 'APPROVED' | 'COMPLETED' | 'FAILED' | 'REJECTED';

export type CancellationReason = 'PERSONAL_EMERGENCY' | 'MEDICAL' | 'CHANGE_OF_PLANS' | 'WEATHER' | 'OTHER';

export interface PassengerDetailDto {
  seatId: number;
  passengerName: string;
  passengerAge: number;
  passengerGender: 'FEMALE' | 'MALE' | 'OTHER';
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

export interface BookingSeatResponse {
  seatId: number;
  seatNumber: string;
  passengerName: string;
  passengerAge: number;
  passengerGender: string;
  isPrimary: boolean;
  isCancelled?: boolean;
}

export interface BookingTimelineResponse {
  event: string;
  description: string;
  occurredAt: string;
}

export interface ScheduleSummary {
  id: number;
  busName: string;
  busNumber: string;
  source: string;
  destination: string;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
}

export interface BookingResponse {
  id: number;
  bookingReference: string;
  status: BookingStatus;
  totalFare: number;
  ticketNumber: string | null;
  qrCodeString: string | null;
  paymentStatus: PaymentStatus;
  contactEmail: string | null;
  contactPhone: string | null;
  couponCode: string | null;
  couponDiscount: number | null;
  bookedAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  scheduleId: number;
  routeId: number;
  providerId: number;
  busId: number;
  userId: string;
  schedule: ScheduleSummary | null;
  seats: BookingSeatResponse[];
  timeline: BookingTimelineResponse[];
}

export interface TicketResponse {
  bookingId: number;
  bookingReference: string;
  ticketNumber: string;
  qrCodeString: string;
  status: BookingStatus;
  scheduleId: number;
  routeId: number;
  providerId: number;
  busId: number;
  busName: string;
  busNumber: string;
  source: string;
  destination: string;
  travelDate: string;
  primaryPassengerName: string;
  totalPassengers: number;
  totalFare: number;
  bookedAt: string;
  confirmedAt: string | null;
}

export interface BookingHistoryResponse {
  id: number;
  bookingReference: string;
  source: string;
  destination: string;
  travelDate: string;
  departureTime: string;
  totalFare: number;
  status: BookingStatus;
  busName: string;
  seatsBooked: number;
  bookedAt: string;
  ticketNumber: string | null;
  paymentStatus: string;
}

export interface PaginatedSearchResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface BookingModificationRequest {
  bookingId: number;
  updatedPassengerDetails?: PassengerDetailDto[];
  contactEmail?: string;
  contactPhone?: string;
}

export interface CancellationRequest {
  bookingId: number;
  reason: CancellationReason;
  reasonText?: string;
}

export interface PartialCancellationRequest {
  bookingId: number;
  seatIds: number[];
  reason: CancellationReason;
  reasonText?: string;
}

export interface RefundResponse {
  id: number;
  refundReference: string;
  bookingId: number;
  bookingReference: string;
  originalAmount: number;
  cancellationCharge: number;
  gstAdjustment: number | null;
  couponAdjustment: number | null;
  netRefundable: number;
  status: RefundStatus;
  reason: string;
  rejectionReason: string | null;
  initiatedAt: string | null;
  processedAt: string | null;
  approvedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  rejectedAt: string | null;
}

export interface CancellationResponse {
  bookingId: number;
  bookingReference: string;
  status: BookingStatus;
  reason: string;
  reasonText: string | null;
  partialCancellation: boolean;
  cancelledSeatIds: number[];
  totalCancelledSeats: number;
  originalFare: number;
  cancellationCharge: number;
  refundAmount: number;
  netPayableAfterCancellation: number;
  refund: RefundResponse | null;
  ticketStatus: string;
}

export interface TripBusBooking {
  bookingId: number;
  bookingReference: string;
  status: BookingStatus;
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

export interface AttachBusBookingRequest {
  bookingId: number;
}
