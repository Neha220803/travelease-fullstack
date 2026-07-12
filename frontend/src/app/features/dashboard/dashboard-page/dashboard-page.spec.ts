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

function trip(overrides: Partial<Trip>): Trip {
  return {
    tripId: 't1',
    tripName: 'Goa Getaway',
    organizer: ORGANIZER,
    sourceLocation: 'Bengaluru',
    destinationId: 2,
    budgetAmount: 20000,
    categoryId: 1,
    startDate: '2026-08-01',
    endDate: '2026-08-05',
    status: 'PLANNING',
    viewerRole: 'ORGANIZER',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

const TRIPS: Trip[] = [
  trip({ tripId: 't1', status: 'PLANNING' }),
  trip({ tripId: 't2', status: 'CONFIRMED' }),
  trip({ tripId: 't3', status: 'COMPLETED' }),
];

const INVITATIONS: PendingInvitation[] = [
  {
    tripMemberId: 'm1',
    tripId: 't9',
    tripName: 'Manali Snow Trip',
    organizer: ORGANIZER,
    sourceLocation: 'Delhi',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    memberStatus: 'INVITED',
  },
];

const NOTIFICATIONS: NotificationResponse[] = Array.from({ length: 5 }, (_, i) => ({
  notificationId: `n${i}`,
  userId: 'u1',
  notificationType: 'INFO',
  title: `Notification ${i}`,
  message: `Message ${i}`,
  isRead: false,
  createdDate: '2026-07-01T00:00:00Z',
}));

async function render(
  tripsService: Partial<TripsService> = {},
  notificationService: Partial<NotificationService> = {},
) {
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
          ...tripsService,
        },
      },
      {
        provide: NotificationService,
        useValue: { getNotifications: () => of(NOTIFICATIONS), ...notificationService },
      },
      {
        provide: DestinationsService,
        useValue: {
          listDestinations: () =>
            of([{ destinationId: 2, destinationName: 'Goa', state: 'Goa', country: 'India', description: '' }]),
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(DashboardPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('DashboardPage', () => {
  it('filters upcoming trips to only planning/confirmed/ongoing statuses', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.upcomingTrips().every((t) => t.status === 'PLANNING' || t.status === 'CONFIRMED')).toBe(
      true,
    );
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

  it('caps notifications at 5 even though the backend returned more', async () => {
    const moreNotifications = Array.from({ length: 8 }, (_, i) => ({ ...NOTIFICATIONS[0], notificationId: `n${i}` }));
    const fixture = await render({}, { getNotifications: () => of(moreNotifications) });
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(moreNotifications.length).toBeGreaterThan(5);
    expect(component.notifications()).toHaveLength(5);
  });
});
