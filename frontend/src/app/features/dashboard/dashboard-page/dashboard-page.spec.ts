import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { of } from 'rxjs';
import {
  lucideCalendar,
  lucideMapPin,
  lucidePlane,
  lucidePlus,
  lucideTrendingUp,
  lucideUsers,
  lucideWallet,
} from '@ng-icons/lucide';
import { DashboardPage } from '@app/features/dashboard/dashboard-page/dashboard-page';
import { TripsService } from '@app/features/trips/services/trips.service';
import { NotificationService } from '@app/features/notifications/services/notification.service';
import { DestinationsService } from '@app/core/destinations/destinations.service';
import { Trip, PendingInvitation } from '@app/features/trips/services/trip.models';
import { NotificationResponse } from '@app/features/notifications/services/notification.models';

const ORGANIZER = { userId: 'u1', name: 'Alice', email: 'alice@travelease.test' };

const TRIPS: Trip[] = [
  {
    tripId: 't1', tripName: 'Goa Beach Escape', organizer: ORGANIZER,
    sourceLocation: 'Bengaluru', destinationId: 2, budgetAmount: 18000, categoryId: 1,
    startDate: '2026-07-12', endDate: '2026-07-16', status: 'PLANNING',
    viewerRole: 'ORGANIZER', createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z',
  },
  {
    tripId: 't2', tripName: 'Manali Winter Trek', organizer: ORGANIZER,
    sourceLocation: 'Delhi', destinationId: 3, budgetAmount: 22000, categoryId: 1,
    startDate: '2026-12-22', endDate: '2026-12-28', status: 'CONFIRMED',
    viewerRole: 'ORGANIZER', createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z',
  },
  {
    tripId: 't3', tripName: 'Kerala Backwaters', organizer: ORGANIZER,
    sourceLocation: 'Chennai', destinationId: 4, budgetAmount: 25000, categoryId: 1,
    startDate: '2026-04-02', endDate: '2026-04-07', status: 'COMPLETED',
    viewerRole: 'ORGANIZER', createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z',
  },
];

const INVITATIONS: PendingInvitation[] = [
  {
    tripMemberId: 'm1', tripId: 't4', tripName: 'Coorg Coffee Trail', organizer: ORGANIZER,
    sourceLocation: 'Bengaluru', startDate: '2026-08-01', endDate: '2026-08-04', memberStatus: 'INVITED',
  },
];

const NOTIFICATIONS: NotificationResponse[] = Array.from({ length: 7 }, (_, i) => ({
  notificationId: `n${i}`,
  userId: 'u1',
  notificationType: 'SYSTEM',
  title: `Notification ${i}`,
  message: `Message ${i}`,
  isRead: false,
  createdDate: '2026-06-01T00:00:00Z',
}));

async function render() {
  await TestBed.configureTestingModule({
    imports: [DashboardPage],
    providers: [
      provideRouter([]),
      provideIcons({
        lucidePlus,
        lucidePlane,
        lucideUsers,
        lucideWallet,
        lucideCalendar,
        lucideTrendingUp,
        lucideMapPin,
      }),
      {
        provide: TripsService,
        useValue: {
          listMyTrips: () => of(TRIPS),
          getPendingInvitations: () => of(INVITATIONS),
        },
      },
      {
        provide: NotificationService,
        useValue: {
          getNotifications: () => of(NOTIFICATIONS),
        },
      },
      {
        provide: DestinationsService,
        useValue: {
          listDestinations: () => of([]),
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(DashboardPage);
  fixture.detectChanges();
  return fixture;
}

describe('DashboardPage', () => {
  it('filters upcoming trips to only planning, confirmed, and ongoing statuses', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;

    expect(
      component.upcomingTrips().every((t) => t.status === 'PLANNING' || t.status === 'CONFIRMED' || t.status === 'ONGOING'),
    ).toBe(true);
    expect(component.upcomingTrips().some((t) => t.status === 'COMPLETED')).toBe(false);
    expect(component.upcomingTrips().length).toBeGreaterThan(0);
    expect(component.upcomingTrips().length).toBeLessThan(TRIPS.length);
  });

  it('renders every pending invitation', async () => {
    const fixture = await render();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const inv of INVITATIONS) {
      expect(text).toContain(inv.tripName);
    }
  });

  it('caps notifications at 5 even though more were returned', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;

    expect(NOTIFICATIONS.length).toBeGreaterThan(5);
    expect(component.notifications()).toHaveLength(5);
    expect(component.notifications()).toEqual(NOTIFICATIONS.slice(0, 5));
  });
});
