export type UserRole =
  | 'TRAVELER'
  | 'ADMIN'
  | 'HOTEL_PROVIDER'
  | 'TRANSPORT_PROVIDER'
  | 'ACTIVITY_PROVIDER';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}
