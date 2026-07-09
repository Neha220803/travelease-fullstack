import { BusStatus } from '@app/features/transport/services/transport-enums';

export type BusType =
  | 'AC_SLEEPER' | 'NON_AC_SLEEPER' | 'AC_SEMI_SLEEPER' | 'NON_AC_SEMI_SLEEPER'
  | 'AC_SEATER' | 'NON_AC_SEATER' | 'AC_LUXURY' | 'NON_AC_LUXURY';

export const BUS_TYPES: BusType[] = [
  'AC_SLEEPER', 'NON_AC_SLEEPER', 'AC_SEMI_SLEEPER', 'NON_AC_SEMI_SLEEPER',
  'AC_SEATER', 'NON_AC_SEATER', 'AC_LUXURY', 'NON_AC_LUXURY',
];

export interface BusResponse {
  id: number;
  busNumber: string;
  busName: string;
  totalSeats: number;
  providerId: number;
  busType: BusType;
  amenities: string[];
  status: BusStatus;
  createdAt: string;
}

/** Form-facing shape — no providerId field; the service injects the Category 5 placeholder. */
export interface BusFormPayload {
  busNumber: string;
  busName: string;
  totalSeats: number;
  busType: BusType;
  amenities: string[];
}
