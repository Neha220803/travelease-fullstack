import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmSidebarService } from '@spartan-ng/helm/sidebar';
import { AuthService } from '@app/core/auth/auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: number;
}

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgIconComponent,
    HlmButtonImports,
    HlmSidebarImports,
    HlmBadgeImports,
  ],
  providers: [HlmSidebarService],
  template: `
    <hlm-sidebar-wrapper>
      <!-- Sidebar -->
      <hlm-sidebar collapsible="icon">
        <hlm-sidebar-header class="border-b border-sidebar-border">
          <div class="flex items-center gap-2 px-2 py-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                 style="background: var(--primary)">
              <ng-icon name="lucidePlane" class="text-white" size="16" />
            </div>
            <div class="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
              <span class="text-sm font-bold text-sidebar-foreground leading-none">TravelEase</span>
              <span class="text-xs text-muted-foreground mt-0.5">Smart Trip Planning</span>
            </div>
          </div>
        </hlm-sidebar-header>

        <hlm-sidebar-content>
          <hlm-sidebar-group>
            <div hlmSidebarGroupLabel class="group-data-[collapsible=icon]:hidden">Main</div>
            <div hlmSidebarGroupContent>
              <ul hlmSidebarMenu>
                @for (item of navItems; track item.path) {
                  <li hlmSidebarMenuItem>
                    <a hlmSidebarMenuButton
                       [routerLink]="item.path"
                       routerLinkActive
                       #rla="routerLinkActive"
                       [isActive]="rla.isActive"
                       [tooltip]="item.label">
                      <ng-icon [name]="item.icon" size="16" />
                      <span class="group-data-[collapsible=icon]:hidden">{{ item.label }}</span>
                    </a>
                    @if (item.badge && item.badge > 0) {
                      <span hlmSidebarMenuBadge>{{ item.badge }}</span>
                    }
                  </li>
                }
              </ul>
            </div>
          </hlm-sidebar-group>
        </hlm-sidebar-content>

        <hlm-sidebar-footer class="border-t border-sidebar-border">
          <!-- User info -->
          <div class="px-2 py-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                   style="background: var(--primary)">
                {{ userInitial() }}
              </div>
              <div class="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden flex-1 min-w-0">
                <span class="text-sm font-medium text-sidebar-foreground truncate">{{ currentUser()?.name ?? 'User' }}</span>
                <span class="text-xs text-muted-foreground truncate">{{ currentUser()?.email ?? '' }}</span>
              </div>
              <button hlmBtn variant="ghost" size="icon-sm"
                      class="flex-shrink-0 group-data-[collapsible=icon]:hidden"
                      (click)="logout()"
                      title="Sign out">
                <ng-icon name="lucideLogOut" size="14" />
              </button>
            </div>
          </div>
        </hlm-sidebar-footer>
        <button hlmSidebarRail></button>
      </hlm-sidebar>

      <!-- Main content area -->
      <main hlmSidebarInset>
        <!-- Top bar -->
        <header class="h-14 flex items-center gap-3 px-4 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-20">
          <button hlmSidebarTrigger class="-ml-1"></button>
          <div class="flex-1"></div>
          <!-- Notification bell -->
          <button hlmBtn variant="ghost" size="icon" routerLink="/notifications" class="relative">
            <ng-icon name="lucideBell" size="18" />
            <span class="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
          </button>
          <!-- Role demo switcher -->
          <div class="flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-lg px-2 py-1 cursor-pointer"
               (click)="showRoleSwitcher.set(!showRoleSwitcher())">
            <ng-icon name="lucideUsers" size="12" />
            <span>Demo: Traveler</span>
            <ng-icon name="lucideChevronsUpDown" size="10" />
          </div>

          @if (showRoleSwitcher()) {
            <div class="absolute top-14 right-4 z-50 bg-popover border border-border rounded-xl shadow-xl p-2 w-52"
                 (clickOutside)="showRoleSwitcher.set(false)">
              @for (role of roles; track role.path) {
                <a [routerLink]="role.path"
                   class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent text-sm cursor-pointer transition-colors"
                   (click)="showRoleSwitcher.set(false)">
                  <ng-icon [name]="role.icon" size="14" />
                  <span>{{ role.label }}</span>
                </a>
              }
            </div>
          }
        </header>

        <!-- Page content -->
        <div class="flex-1 p-6">
          <router-outlet />
        </div>
      </main>
    </hlm-sidebar-wrapper>
  `,
})
export class AppShell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = this.auth.currentUser;
  readonly userInitial = computed(() => {
    const name = this.currentUser()?.name ?? 'U';
    return name.charAt(0).toUpperCase();
  });

  readonly showRoleSwitcher = signal(false);

  readonly navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'lucideLayoutDashboard' },
    { path: '/trips', label: 'My Trips', icon: 'lucideMapPin' },
    { path: '/expenses', label: 'Expenses', icon: 'lucideReceipt' },
    { path: '/invitations', label: 'Invitations', icon: 'lucideMail', badge: 2 },
    { path: '/notifications', label: 'Notifications', icon: 'lucideBell', badge: 3 },
    { path: '/profile', label: 'Profile', icon: 'lucideUser' },
  ];

  readonly roles = [
    { path: '/dashboard', label: 'Traveler', icon: 'lucideUser' },
    { path: '/admin', label: 'Admin', icon: 'lucideShield' },
    { path: '/hotel', label: 'Hotel Provider', icon: 'lucideHotel' },
    { path: '/transport', label: 'Transport Provider', icon: 'lucideBus' },
    { path: '/activity', label: 'Activity Provider', icon: 'lucideActivity' },
  ];

  logout(): void {
    this.auth.logout();
  }
}
