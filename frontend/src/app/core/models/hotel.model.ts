export interface Hotel {
  id: string;
  name: string;
  destinationId: string;
  destinationName: string;
  address: string;
  rating: number;
  reviewCount: number;
  pricePerNight: number;
  amenities: string[];
  imageUrl?: string;
  description: string;
  providerId?: string;
}

export interface HotelRoom {
  id: string;
  hotelId: string;
  type: 'STANDARD' | 'DELUXE' | 'SUITE' | 'FAMILY' | 'TWIN' | 'SINGLE';
  name: string;
  capacity: number;
  pricePerNight: number;
  amenities: string[];
  available: boolean;
  imageUrl?: string;
}

export type HotelBookingStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED';

export interface HotelBooking {
  id: string;
  tripId: string;
  hotelId: string;
  hotelName: string;
  roomId?: string;
  roomType?: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  status: HotelBookingStatus;
  guestCount: number;
  createdAt: string;
}

export interface HotelReview {
  id: string;
  hotelId: string;
  hotelName: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  description: string;
  imageUrl?: string;
  popularAttractions: string[];
}
