import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import {
  lucideCalendar,
  lucideMapPin,
  lucidePlane,
  lucidePlus,
  lucideTrendingUp,
  lucideUsers,
  lucideWallet,
} from '@ng-icons/lucide';
import { of } from 'rxjs';
import { invitations, notifications, trips } from '@app/core/mock-data';
import { DashboardPage } from '@app/features/dashboard/dashboard-page/dashboard-page';
import { TripsService } from '@app/features/trips/services/trips.service';
import { NotificationService } from '@app/features/notifications/services/notification.service';
import { DestinationsService } from '@app/core/destinations/destinations.service';

describe('DashboardPage', () => {
  beforeEach(async () => {
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
        { provide: TripsService, useValue: { listMyTrips: () => of(trips), getPendingInvitations: () => of(invitations) } },
        { provide: NotificationService, useValue: { getNotifications: () => of(notifications) } },
        { provide: DestinationsService, useValue: { listDestinations: () => of([]) } },
      ],
    }).compileComponents();
  });

  it('filters upcoming trips to only upcoming and planning statuses', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(
      component.upcomingTrips().every((t) => t.status === 'PLANNING' || t.status === 'CONFIRMED' || t.status === 'ONGOING'),
    ).toBe(true);
    expect(component.upcomingTrips().some((t) => t.status === 'COMPLETED')).toBe(false);
    expect(component.upcomingTrips().length).toBeGreaterThan(0);
    expect(component.upcomingTrips().length).toBeLessThan(trips.length);
  });

  it('renders every pending invitation', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const inv of invitations) {
      expect(text).toContain(inv.trip);
    }
  });

  it('caps notifications at 5 even though more are returned', () => {
    // Shared mock-data only has 5 notifications, which isn't enough to prove
    // capping actually truncates — override with a locally-defined 7-item
    // list just for this test so the >5 case is genuinely exercised.
    const manyNotifications = Array.from({ length: 7 }, (_, i) => ({
      ...notifications[0],
      id: `extra-${i}`,
    }));
    TestBed.overrideProvider(NotificationService, {
      useValue: { getNotifications: () => of(manyNotifications) },
    });

    const fixture = TestBed.createComponent(DashboardPage);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.notifications()).toHaveLength(5);
    expect(component.notifications()).toEqual(manyNotifications.slice(0, 5));
  });
});
