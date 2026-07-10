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

export type SeatType = 'WINDOW' | 'AISLE' | 'LADIES' | 'RESERVED' | 'DRIVER';

export type SeatStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'MAINTENANCE';

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

export interface SeatLockRequest {
  scheduleId: number;
  seatIds: number[];
}

export interface SeatLockResponse {
  scheduleId: number;
  lockedSeatIds: number[];
  lockedAt: string;
  expiresAt: string;
  message: string;
}

export interface SeatOccupancyResponse {
  scheduleId: number;
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  lockedSeats: number;
  occupancyPercentage: number;
}

export interface FareCalculationRequest {
  scheduleId: number;
  seatIds: number[];
  couponCode?: string;
}

export interface SeatFareBreakdown {
  seatId: number;
  seatNumber: string;
  seatType: SeatType;
  baseFare: number;
  seatTypeSurcharge: number;
  dynamicAdjustment: number;
  subtotal: number;
  discount: number;
  finalFare: number;
}

export interface FareBreakdownResponse {
  scheduleId: number;
  routeId: number;
  busId: number;
  busNumber: string;
  busType: string;
  source: string;
  destination: string;
  travelDate: string;
  numberOfSeats: number;
  occupancyPercentage: number;
  baseFare: number;
  dynamicFareAdjustment: number;
  weekendSurcharge: number;
  festivalSurcharge: number;
  seasonalSurcharge: number;
  seatTypeSurcharge: number;
  busTypeSurcharge: number;
  subtotal: number;
  discountAmount: number;
  appliedDiscount: string | null;
  couponDiscount: number;
  appliedCoupon: string | null;
  gstAmount: number;
  gstPercent: number;
  taxAmount: number;
  taxPercent: number;
  finalAmount: number;
  cancellationChargePercent: number;
  refundPercent: number;
  cancellationCharge: number;
  refundAmount: number;
  seatBreakdowns: SeatFareBreakdown[];
}

export interface PriceCalculatorResponse {
  breakdown: FareBreakdownResponse;
  totalPayable: number;
  totalSavings: number;
}

export interface CancellationPreviewResponse {
  scheduleId: number;
  originalFare: number;
  cancellationChargePercent: number;
  cancellationCharge: number;
  refundPercent: number;
  refundableAmount: number;
}
