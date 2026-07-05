export type TripStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type TravelerCategory = 'SOLO' | 'COUPLE' | 'FAMILY' | 'FRIENDS' | 'CORPORATE';

export interface Trip {
  id: string;
  name: string;
  source: string;
  destination: string;
  destinationId: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  travelerCategory: TravelerCategory;
  organizerId: string;
  memberCount: number;
  budgetAmount?: number;
  coverImage?: string;
  createdAt: string;
}

export interface TripMember {
  id: string;
  tripId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: 'ORGANIZER' | 'MEMBER';
  joinedAt: string;
}

export interface TravelerCategoryOption {
  id: string;
  name: TravelerCategory;
  label: string;
  description: string;
}
