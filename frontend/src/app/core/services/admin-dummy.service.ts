import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { User } from '@app/core/models/user.model';
import { Trip } from '@app/core/models/trip.model';
import { Hotel, Destination } from '@app/core/models/hotel.model';
import { Transport } from '@app/core/models/transport.model';
import { Activity, Attraction } from '@app/core/models/activity.model';
import {
  MOCK_USERS, MOCK_TRIPS, MOCK_HOTELS, MOCK_TRANSPORTS,
  MOCK_ACTIVITIES, MOCK_DESTINATIONS, MOCK_ATTRACTIONS, MOCK_ADMIN_STATS, MOCK_ADMIN_FUNNEL
} from '@app/core/data/mock-data';

export interface AdminStats {
  totalUsers: number;
  totalTrips: number;
  activeTrips: number;
  totalRevenue: number;
  hotelBookings: number;
  transportBookings: number;
  activityBookings: number;
  pendingApprovals: number;
  recentGrowth: { users: number; trips: number; revenue: number };
}

export interface Partner {
  id: string;
  name: string;
  type: 'HOTEL_PROVIDER' | 'TRANSPORT_PROVIDER' | 'ACTIVITY_PROVIDER';
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  email: string;
  phone: string;
  joinedAt: string;
}

const MOCK_PARTNERS: Partner[] = [
  { id: 'p1', name: 'Grand Royale Hotels', type: 'HOTEL_PROVIDER', status: 'ACTIVE', email: 'hotels@grandroyale.com', phone: '+91 88888 00001', joinedAt: '2025-01-01T10:00:00Z' },
  { id: 'p2', name: 'FastTrack Transport', type: 'TRANSPORT_PROVIDER', status: 'ACTIVE', email: 'ops@fasttrack.com', phone: '+91 77777 00001', joinedAt: '2025-01-01T10:00:00Z' },
  { id: 'p3', name: 'Adventure Plus Activities', type: 'ACTIVITY_PROVIDER', status: 'ACTIVE', email: 'ops@adventureplus.com', phone: '+91 66666 00001', joinedAt: '2025-01-01T10:00:00Z' },
  { id: 'p4', name: 'Coastal Stays', type: 'HOTEL_PROVIDER', status: 'PENDING', email: 'info@coastalstays.com', phone: '+91 55555 00001', joinedAt: '2026-06-15T10:00:00Z' },
];

@Injectable({ providedIn: 'root' })
export class AdminDummyService {
  /** TODO: GET /api/admin/stats */
  getStats(): Observable<AdminStats> {
    return of(MOCK_ADMIN_STATS).pipe(delay(500));
  }

  /** TODO: GET /api/admin/funnel */
  getFunnelData(): Observable<{ stage: string; count: number }[]> {
    return of(MOCK_ADMIN_FUNNEL).pipe(delay(400));
  }

  // --- USERS ---
  /** TODO: GET /api/users (admin) */
  getUsers(): Observable<User[]> {
    return of([...MOCK_USERS]).pipe(delay(400));
  }

  /** TODO: DELETE /api/users/{userId} (deactivate) */
  deactivateUser(userId: string): Observable<User> {
    const user = MOCK_USERS.find(u => u.id === userId) ?? MOCK_USERS[0];
    return of(user).pipe(delay(400));
  }

  // --- TRIPS ---
  /** TODO: GET /api/trips (admin) */
  getAllTrips(): Observable<Trip[]> {
    return of([...MOCK_TRIPS]).pipe(delay(400));
  }

  // --- HOTELS ---
  /** TODO: GET /api/hotels (admin) */
  getHotels(): Observable<Hotel[]> {
    return of([...MOCK_HOTELS]).pipe(delay(400));
  }

  /** TODO: POST /api/hotels */
  createHotel(data: Partial<Hotel>): Observable<Hotel> {
    return of({ id: `h${Date.now()}`, name: data.name ?? '', ...data } as Hotel).pipe(delay(600));
  }

  /** TODO: DELETE /api/hotels/{hotelId} */
  deleteHotel(hotelId: string): Observable<null> {
    return of(null).pipe(delay(400));
  }

  // --- DESTINATIONS ---
  /** TODO: GET /api/destinations */
  getDestinations(): Observable<Destination[]> {
    return of(MOCK_DESTINATIONS).pipe(delay(400));
  }

  // --- TRANSPORTS ---
  /** TODO: GET /api/transports (admin) */
  getTransports(): Observable<Transport[]> {
    return of([...MOCK_TRANSPORTS]).pipe(delay(400));
  }

  /** TODO: POST /api/transports */
  createTransport(data: Partial<Transport>): Observable<Transport> {
    return of({ id: `tr${Date.now()}`, ...data } as Transport).pipe(delay(600));
  }

  // --- ATTRACTIONS ---
  /** TODO: GET /api/attractions */
  getAttractions(): Observable<Attraction[]> {
    return of(MOCK_ATTRACTIONS).pipe(delay(400));
  }

  // --- ACTIVITIES ---
  /** TODO: GET /api/activities (admin) */
  getActivities(): Observable<Activity[]> {
    return of([...MOCK_ACTIVITIES]).pipe(delay(400));
  }

  // --- PARTNERS ---
  /** TODO: GET /api/partners */
  getPartners(): Observable<Partner[]> {
    return of([...MOCK_PARTNERS]).pipe(delay(400));
  }

  /** TODO: PATCH /api/partners/{partnerId}/approve */
  approvePartner(partnerId: string): Observable<Partner> {
    const p = MOCK_PARTNERS.find(pt => pt.id === partnerId) ?? MOCK_PARTNERS[0];
    return of({ ...p, status: 'ACTIVE' as const }).pipe(delay(500));
  }

  // --- APPROVALS ---
  /** TODO: GET /api/admin/approvals */
  getPendingApprovals(): Observable<Partner[]> {
    return of(MOCK_PARTNERS.filter(p => p.status === 'PENDING')).pipe(delay(400));
  }
}
