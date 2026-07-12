import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import {
  lucideAlertTriangle,
  lucideBellRing,
  lucideCheckCircle2,
  lucideMail,
  lucideWallet,
} from '@ng-icons/lucide';
import { of } from 'rxjs';
import {
  NotificationList,
  iconForNotificationType,
} from '@app/features/notifications/components/notification-list/notification-list';
import { NotificationService } from '@app/features/notifications/services/notification.service';
import { NotificationResponse } from '@app/features/notifications/services/notification.models';

describe('iconForNotificationType', () => {
  it('maps a known type to its icon regardless of case', () => {
    expect(iconForNotificationType('invitation')).toBe('lucideMail');
    expect(iconForNotificationType('INVITATION')).toBe('lucideMail');
  });

  it('falls back to lucideBellRing for an unmapped type', () => {
    expect(iconForNotificationType('unknown')).toBe('lucideBellRing');
  });
});

const UNREAD: NotificationResponse[] = [
  {
    notificationId: 'n1',
    userId: 'u1',
    notificationType: 'INVITATION',
    title: 'Trip Invitation',
    message: 'Alice invited you to Goa Getaway',
    isRead: false,
    createdDate: '2026-07-01T00:00:00Z',
  },
  {
    notificationId: 'n2',
    userId: 'u1',
    notificationType: 'BUDGET',
    title: 'Budget Alert',
    message: 'You are close to your trip budget',
    isRead: false,
    createdDate: '2026-07-02T00:00:00Z',
  },
];

async function setup(notifications: NotificationResponse[] = UNREAD) {
  const markAsRead = vi.fn((id: string) =>
    of({ ...notifications.find((n) => n.notificationId === id)!, isRead: true }),
  );
  const decrementUnreadCount = vi.fn();
  const notificationService: Partial<NotificationService> = {
    getNotifications: () => of(notifications),
    markAsRead,
    decrementUnreadCount,
    unreadCount: signal(notifications.length),
  };

  await TestBed.configureTestingModule({
    imports: [NotificationList],
    providers: [
      provideIcons({ lucideAlertTriangle, lucideBellRing, lucideCheckCircle2, lucideMail, lucideWallet }),
      { provide: NotificationService, useValue: notificationService },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(NotificationList);
  fixture.detectChanges();
  return { fixture, markAsRead, decrementUnreadCount };
}

describe('NotificationList', () => {
  it('fetches only unread notifications and renders their title, message, type and time', async () => {
    const { fixture } = await setup();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const n of UNREAD) {
      expect(text).toContain(n.title);
      expect(text).toContain(n.message);
      expect(text).toContain(n.notificationType);
    }
  });

  it('shows "No new notifications" when there are none', async () => {
    const { fixture } = await setup([]);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No new notifications');
  });

  it('marks a notification as read on click, removes it from the list, and decrements the badge', async () => {
    const { fixture, markAsRead, decrementUnreadCount } = await setup();
    const row = (fixture.nativeElement as HTMLElement).querySelector(
      '[class*="cursor-pointer"]',
    ) as HTMLElement;
    row.click();
    fixture.detectChanges();

    expect(markAsRead).toHaveBeenCalledWith('n1');
    expect(decrementUnreadCount).toHaveBeenCalled();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Trip Invitation');
    expect(text).toContain('Budget Alert');
  });
});
