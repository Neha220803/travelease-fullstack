export type ActivityDifficulty = 'EASY' | 'MODERATE' | 'HARD';
export type ActivityBookingStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED';

export interface Activity {
  id: string;
  name: string;
  destinationId: string;
  destinationName: string;
  description: string;
  category: string;
  difficulty: ActivityDifficulty;
  durationMinutes: number;
  price: number;
  maxCapacity: number;
  availableSlots: number;
  timings: string[];
  imageUrl?: string;
  providerId?: string;
  travelerCategoryTags: string[];
}

export interface ActivityBooking {
  id: string;
  tripId: string;
  activityId: string;
  activityName: string;
  scheduledDate: string;
  scheduledTime: string;
  participantCount: number;
  totalAmount: number;
  status: ActivityBookingStatus;
  createdAt: string;
}

export interface ActivityCapacitySlot {
  id: string;
  activityId: string;
  activityName: string;
  date: string;
  time: string;
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
}

export interface Attraction {
  id: string;
  name: string;
  destinationId: string;
  destinationName: string;
  description: string;
  entryFee?: number;
  openingHours: string;
  imageUrl?: string;
  travelerCategoryTags: string[];
  rating: number;
}
