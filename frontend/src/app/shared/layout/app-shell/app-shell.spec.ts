import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import {
  lucideActivity,
  lucideBarChart3,
  lucideBell,
  lucideBus,
  lucideCalendarDays,
  lucideDoorOpen,
  lucideHotel,
  lucideLayoutDashboard,
  lucideLifeBuoy,
  lucideLogOut,
  lucideMail,
  lucideMenu,
  lucidePlane,
  lucidePlus,
  lucideRoute,
  lucideSearch,
  lucideStar,
  lucideTrendingUp,
  lucideUser,
  lucideUserCheck,
  lucideUsers,
  lucideWallet,
  lucideX,
} from '@ng-icons/lucide';
import { of } from 'rxjs';
import { AppShell } from '@app/shared/layout/app-shell/app-shell';
import { AuthService } from '@app/core/auth/auth.service';
import { NotificationService } from '@app/features/notifications/services/notification.service';

const ALL_ICONS = {
  lucideActivity,
  lucideBarChart3,
  lucideBell,
  lucideBus,
  lucideCalendarDays,
  lucideDoorOpen,
  lucideHotel,
  lucideLayoutDashboard,
  lucideLifeBuoy,
  lucideLogOut,
  lucideMail,
  lucideMenu,
  lucidePlane,
  lucidePlus,
  lucideRoute,
  lucideSearch,
  lucideStar,
  lucideTrendingUp,
  lucideUser,
  lucideUserCheck,
  lucideUsers,
  lucideWallet,
  lucideX,
};

async function configureWithRole(role: string | undefined) {
  await TestBed.configureTestingModule({
    imports: [AppShell],
    providers: [
      provideRouter([]),
      provideIcons(ALL_ICONS),
      { provide: ActivatedRoute, useValue: { data: of(role === undefined ? {} : { role }) } },
      { provide: AuthService, useValue: { logout: vi.fn(), isAuthenticated: () => true, role: () => role ?? 'traveler', currentUser: () => ({ name: 'Test User' }) } },
      { provide: NotificationService, useValue: { getNotifications: () => of([]) } },
    ],
  }).compileComponents();
}

/** The nav sheet is portal-rendered (CDK overlay) outside fixture.nativeElement, so
 * assertions on its content read from document.body once opened. */
async function openSidebar(fixture: ReturnType<typeof TestBed.createComponent<AppShell>>) {
  const menuButton = (fixture.nativeElement as HTMLElement).querySelector(
    'button[aria-label="Open navigation menu"]',
  ) as HTMLButtonElement;
  menuButton.click();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('AppShell', () => {
  it('does not render nav items until the menu icon is clicked', async () => {
    await configureWithRole('traveler');
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.body.textContent).not.toContain('My Trips');
  });

  it('renders traveler nav items after the menu icon is clicked', async () => {
    await configureWithRole('traveler');
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    await fixture.whenStable();
    await openSidebar(fixture);
    expect(document.body.textContent).toContain('My Trips');
    expect(document.body.textContent).toContain('Invitations');
  });

  it('renders the Bus Booking nav entry for the traveler role', async () => {
    await configureWithRole('traveler');
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    await fixture.whenStable();
    await openSidebar(fixture);
    expect(document.body.textContent).toContain('Bus Booking');
  });

  it('renders admin nav items', async () => {
    await configureWithRole('admin');
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    await fixture.whenStable();
    await openSidebar(fixture);
    expect(document.body.textContent).toContain('Route Analytics');
    expect(document.body.textContent).toContain('Partner Approvals');
  });

  it('shows the New Trip button for the traveler role', async () => {
    await configureWithRole('traveler');
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('New Trip');
  });

  it('hides the New Trip button for the admin role', async () => {
    await configureWithRole('admin');
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('New Trip');
  });

  it('defaults to the traveler role when route data has no role', async () => {
    await configureWithRole(undefined);
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    await fixture.whenStable();
    await openSidebar(fixture);
    expect(document.body.textContent).toContain('My Trips');
  });

  it('calls AuthService.logout() and navigates to /login when Sign out is clicked', async () => {
    await configureWithRole('traveler');
    const fixture = TestBed.createComponent(AppShell);
    const router = TestBed.inject(Router);
    const authService = TestBed.inject(AuthService);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    await fixture.whenStable();
    await openSidebar(fixture);

    const buttons = Array.from(document.body.querySelectorAll('button')) as HTMLButtonElement[];
    const signOutButton = buttons.find((b) => b.textContent?.includes('Sign out'))!;
    signOutButton.click();

    expect(authService.logout).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
