export interface HotelBooking {
  hotelBookingId: string;
  tripId: string;
  hotelId: string;
  hotelName: string;
  bookedByUserId: string;
  bookedByUserName: string;
  checkInDate: string;
  checkOutDate: string;
  roomType: string;
  roomNumber: string;
  totalAmount: number;
  bookingStatus: string;
}

export interface AccommodationSummary {
  tripId: string;
  bookingCount: number;
  totalAmount: number;
  bookings: HotelBooking[];
}
