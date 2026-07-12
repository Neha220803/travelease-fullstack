import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, startWith } from 'rxjs';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { BrnSheetContent } from '@spartan-ng/brain/sheet';
import { Role, ROLE_HOME } from '@app/core/auth/auth.models';
import { AuthService } from '@app/core/auth/auth.service';
import { NotificationService } from '@app/features/notifications/services/notification.service';
import { ThemeToggle } from '@app/shared/ui/theme-toggle/theme-toggle';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV_MAP: Record<Role, NavItem[]> = {
  traveler: [
    { to: '/dashboard', label: 'Dashboard', icon: 'lucideLayoutDashboard' },
    { to: '/trips', label: 'My Trips', icon: 'lucidePlane' },
    { to: '/bus-booking', label: 'Bus Booking', icon: 'lucideBus' },
    { to: '/invitations', label: 'Invitations', icon: 'lucideMail' },
    { to: '/notifications', label: 'Notifications', icon: 'lucideBell' },
    { to: '/support/tickets', label: 'Contact Support', icon: 'lucideLifeBuoy' },
    { to: '/profile', label: 'Profile', icon: 'lucideUser' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: 'lucideLayoutDashboard' },
    { to: '/admin/route-analytics', label: 'Route Analytics', icon: 'lucideRoute' },
    { to: '/admin/partners', label: 'Partner Analytics', icon: 'lucideTrendingUp' },
    { to: '/admin/funnel', label: 'Booking Funnel', icon: 'lucideBarChart3' },
    { to: '/admin/approvals', label: 'Partner Approvals', icon: 'lucideUserCheck' },
    { to: '/admin/users', label: 'Users', icon: 'lucideUsers' },
    // { to: '/admin/trips', label: 'Trips', icon: 'lucidePlane' },
    // { to: '/admin/buses', label: 'Bus Management', icon: 'lucideBus' },
    // { to: '/admin/hotels', label: 'Hotel Management', icon: 'lucideHotel' },
    { to: '/admin/support-tickets', label: 'Support Tickets', icon: 'lucideLifeBuoy' },
    { to: '/admin/reports', label: 'Reports', icon: 'lucideBarChart3' },
    { to: '/admin/notifications', label: 'Notifications', icon: 'lucideBell' },
  ],
  hotel: [
    { to: '/hotel', label: 'Dashboard', icon: 'lucideLayoutDashboard' },
    { to: '/hotel/properties', label: 'Hotels', icon: 'lucideHotel' },
    { to: '/hotel/rooms', label: 'Rooms', icon: 'lucideDoorOpen' },
    { to: '/hotel/bookings', label: 'Bookings', icon: 'lucideCalendarDays' },
    { to: '/hotel/reviews', label: 'Reviews', icon: 'lucideStar' },
    { to: '/hotel/reports', label: 'Reports', icon: 'lucideBarChart3' },
    { to: '/hotel/support-tickets', label: 'Support Tickets', icon: 'lucideLifeBuoy' },
    { to: '/hotel/notifications', label: 'Notifications', icon: 'lucideBell' },
  ],
  transport: [
    { to: '/transport', label: 'Dashboard', icon: 'lucideLayoutDashboard' },
    { to: '/transport/vehicles', label: 'Vehicles', icon: 'lucideBus' },
    { to: '/transport/staff', label: 'Staff', icon: 'lucideUsers' },
    { to: '/transport/schedules', label: 'Schedules', icon: 'lucideCalendarClock' },
    { to: '/transport/trips', label: 'Bus Trips', icon: 'lucideNavigation' },
    { to: '/transport/bookings', label: 'Booking Analytics', icon: 'lucideChartLine' },
    { to: '/transport/reports', label: 'Reports', icon: 'lucideBarChart3' },
    { to: '/transport/support-tickets', label: 'Support Tickets', icon: 'lucideLifeBuoy' },
    { to: '/transport/notifications', label: 'Notifications', icon: 'lucideBell' },
  ],
  activity: [
    { to: '/activity', label: 'Dashboard', icon: 'lucideLayoutDashboard' },
    { to: '/activity/activities', label: 'Activities', icon: 'lucideActivity' },
    { to: '/activity/bookings', label: 'Bookings', icon: 'lucideCalendarDays' },
    { to: '/activity/capacity', label: 'Capacity', icon: 'lucideUsers' },
    { to: '/activity/reports', label: 'Reports', icon: 'lucideBarChart3' },
    { to: '/activity/support-tickets', label: 'Support Tickets', icon: 'lucideLifeBuoy' },
    { to: '/activity/notifications', label: 'Notifications', icon: 'lucideBell' },
  ],
};

const ROLE_PATH_PREFIX: Record<Role, string> = {
  traveler: '',
  admin: '/admin',
  hotel: '/hotel',
  transport: '/transport',
  activity: '/activity',
};

const ROLE_LABEL: Record<Role, string> = {
  traveler: 'Traveler',
  admin: 'Admin',
  hotel: 'Hotel Partner',
  transport: 'Transport Partner',
  activity: 'Activity Provider',
};

@Component({
  selector: 'app-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NgIcon,
    HlmButtonImports,
    HlmInputImports,
    HlmAvatarImports,
    HlmToasterImports,
    HlmSheetImports,
    BrnSheetContent,
    ThemeToggle,
  ],
  templateUrl: './app-shell.html',
})
export class AppShell {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  protected readonly unreadCount = this.notificationService.unreadCount;
  protected readonly hasUnreadNotifications = computed(() => this.unreadCount() > 0);
  protected readonly sidebarOpen = signal(false);

  constructor() {
    // Only fetch if authenticated (which is usually true here)
    if (this.authService.isAuthenticated()) {
      this.notificationService.refreshUnreadCount();
    }

    this.router.events.pipe(filter((event) => event instanceof NavigationStart)).subscribe(() => {
      this.sidebarOpen.set(false);
    });
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  protected onSidebarStateChanged(state: 'open' | 'closed'): void {
    this.sidebarOpen.set(state === 'open');
  }

  // Use route data as primary source of truth — it is set synchronously from
  // the route config so there is never a frame where it defaults to 'traveler'.
  private readonly routeData = toSignal(
    this.route.data.pipe(startWith(this.route.snapshot.data)),
  );

  protected readonly role = computed(
    () =>
      (this.routeData()?.['role'] as Role | undefined) ??
      this.authService.role() ??
      'traveler',
  );

  protected readonly nav = computed(() => NAV_MAP[this.role()]);
  protected readonly roleLabel = computed(() => ROLE_LABEL[this.role()]);
  protected readonly home = computed(() => ROLE_HOME[this.role()]);
  protected readonly notificationsPath = computed(() => `${ROLE_PATH_PREFIX[this.role()]}/notifications`);

  protected readonly notificationsLink = computed(() => {
    const role = this.role();
    return role === 'traveler' ? '/notifications' : `/${role}/notifications`;
  });

  protected readonly userInitials = computed(() => {
    const user = this.authService.currentUser();
    const name = user?.name ?? '';

    return name
      .split(' ')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  });

  protected signOut(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
