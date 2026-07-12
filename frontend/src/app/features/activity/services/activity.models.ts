export interface Activity {
  activityId: string;
  providerId: number;
  destinationId: number;
  activityName: string;
  durationHours: number;
  startTime: string;
  endTime: string;
  description: string | null;
  price: number | null;
}

export interface ActivityPayload {
  destinationId: number;
  activityName: string;
  durationHours: number;
  startTime: string;
  endTime: string;
  description: string;
}

export interface ActivitySlot {
  activitySlotId: string;
  activityId: string;
  activityDate: string;
  startTime: string;
  endTime: string;
  price: number;
  capacity: number;
  remainingCapacity: number;
}

export interface ActivitySlotPayload {
  activityDate: string;
  startTime: string;
  endTime: string;
  price: number;
  capacity: number;
}

export type ActivityBookingStatus = 'CONFIRMED' | 'CANCELLED' | 'ATTENDED' | 'NO_SHOW';

export interface ActivityBooking {
  bookingId: string;
  activitySlotId: string;
  activityId: string;
  activityName: string;
  activityDate: string;
  startTime: string;
  endTime: string;
  participantCount: number;
  pricePerParticipant: number;
  totalAmount: number;
  status: ActivityBookingStatus;
  bookedAt: string;
  bookedByUserId: string;
}

export interface ActivityOverview {
  activity: Activity;
  slots: ActivitySlot[];
  bookings: ActivityBooking[];
}
