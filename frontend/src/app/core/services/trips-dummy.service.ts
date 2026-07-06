import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Trip, TripMember, TravelerCategoryOption } from '@app/core/models/trip.model';
import { MOCK_TRIPS, MOCK_TRIP_MEMBERS } from '@app/core/data/mock-data';

const CATEGORIES: TravelerCategoryOption[] = [
  { id: 'c1', name: 'SOLO', label: 'Solo', description: 'Travelling alone — focus on personal exploration' },
  { id: 'c2', name: 'COUPLE', label: 'Couple', description: 'Romantic getaway for two' },
  { id: 'c3', name: 'FAMILY', label: 'Family', description: 'Family vacation with children' },
  { id: 'c4', name: 'FRIENDS', label: 'Friends', description: 'Group trip with friends' },
  { id: 'c5', name: 'CORPORATE', label: 'Corporate', description: 'Business or team travel' },
];

@Injectable({ providedIn: 'root' })
export class TripsDummyService {
  /** TODO: GET /api/trips (list all user trips) */
  getMyTrips(): Observable<Trip[]> {
    return of([...MOCK_TRIPS]).pipe(delay(400));
  }

  /** TODO: GET /api/trips/{tripId} */
  getTrip(tripId: string): Observable<Trip | undefined> {
    return of(MOCK_TRIPS.find(t => t.id === tripId)).pipe(delay(300));
  }

  /** TODO: GET /api/trips/{tripId}/members */
  getTripMembers(tripId: string): Observable<TripMember[]> {
    return of(MOCK_TRIP_MEMBERS.filter(m => m.tripId === tripId)).pipe(delay(300));
  }

  /** TODO: POST /api/trips */
  createTrip(data: Partial<Trip>): Observable<Trip> {
    const newTrip: Trip = {
      id: `trip${Date.now()}`,
      name: data.name ?? 'New Trip',
      source: data.source ?? '',
      destination: data.destination ?? '',
      destinationId: data.destinationId ?? '',
      startDate: data.startDate ?? '',
      endDate: data.endDate ?? '',
      status: 'UPCOMING',
      travelerCategory: data.travelerCategory ?? 'SOLO',
      organizerId: 'u1',
      memberCount: 1,
      createdAt: new Date().toISOString(),
    };
    return of(newTrip).pipe(delay(600));
  }

  /** TODO: PUT /api/trips/{tripId} */
  updateTrip(tripId: string, data: Partial<Trip>): Observable<Trip> {
    const existing = MOCK_TRIPS.find(t => t.id === tripId) ?? MOCK_TRIPS[0];
    return of({ ...existing, ...data }).pipe(delay(500));
  }

  /** TODO: PATCH /api/trips/{tripId}/cancel */
  cancelTrip(tripId: string): Observable<Trip> {
    const trip = MOCK_TRIPS.find(t => t.id === tripId) ?? MOCK_TRIPS[0];
    return of({ ...trip, status: 'CANCELLED' } as Trip).pipe(delay(500));
  }

  /** TODO: PUT /api/trips/{tripId}/category */
  updateTripCategory(tripId: string, categoryId: string): Observable<Trip> {
    const trip = MOCK_TRIPS.find(t => t.id === tripId) ?? MOCK_TRIPS[0];
    return of({ ...trip }).pipe(delay(400));
  }

  /** TODO: GET /api/traveler-categories */
  getTravelerCategories(): Observable<TravelerCategoryOption[]> {
    return of(CATEGORIES).pipe(delay(200));
  }
}
