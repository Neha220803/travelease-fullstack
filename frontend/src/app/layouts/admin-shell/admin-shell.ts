import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmSidebarService } from '@spartan-ng/helm/sidebar';
import { AuthService } from '@app/core/auth/auth.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIconComponent, HlmButtonImports, HlmSidebarImports, HlmBadgeImports],
  providers: [HlmSidebarService],
  template: `
    <hlm-sidebar-wrapper>
      <hlm-sidebar collapsible="icon">
        <hlm-sidebar-header class="border-b border-sidebar-border">
          <div class="flex items-center gap-2 px-2 py-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                 style="background: oklch(0.45 0.15 270)">
              <ng-icon name="lucideShield" class="text-white" size="16" />
            </div>
            <div class="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
              <span class="text-sm font-bold text-sidebar-foreground">TravelEase Admin</span>
              <span class="text-xs text-muted-foreground">Control Center</span>
            </div>
          </div>
        </hlm-sidebar-header>

        <hlm-sidebar-content>
          <hlm-sidebar-group>
            <div hlmSidebarGroupLabel class="group-data-[collapsible=icon]:hidden">Platform</div>
            <div hlmSidebarGroupContent>
              <ul hlmSidebarMenu>
                @for (item of navItems; track item.path) {
                  <li hlmSidebarMenuItem>
                    <a hlmSidebarMenuButton [routerLink]="item.path" routerLinkActive #rla="routerLinkActive" [isActive]="rla.isActive" [tooltip]="item.label">
                      <ng-icon [name]="item.icon" size="16" />
                      <span class="group-data-[collapsible=icon]:hidden">{{ item.label }}</span>
                    </a>
                    @if (item.badge) {
                      <span hlmSidebarMenuBadge variant="destructive" class="ml-auto text-[10px] px-1.5 py-0 h-4 group-data-[collapsible=icon]:hidden">{{ item.badge }}</span>
                    }
                  </li>
                }
              </ul>
            </div>
          </hlm-sidebar-group>
        </hlm-sidebar-content>

        <hlm-sidebar-footer class="border-t border-sidebar-border">
          <div class="px-2 py-3 flex items-center gap-2">
            <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                 style="background: oklch(0.45 0.15 270)">A</div>
            <div class="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden flex-1">
              <span class="text-sm font-medium truncate">Admin User</span>
              <span class="text-xs text-muted-foreground truncate">admin@travelease.com</span>
            </div>
            <button hlmBtn variant="ghost" size="icon-sm" (click)="logout()" class="group-data-[collapsible=icon]:hidden">
              <ng-icon name="lucideLogOut" size="14" />
            </button>
          </div>
        </hlm-sidebar-footer>
        <button hlmSidebarRail></button>
      </hlm-sidebar>

      <main hlmSidebarInset>
        <header class="h-14 flex items-center gap-3 px-4 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-20">
          <button hlmSidebarTrigger class="-ml-1"></button>
          <div class="text-sm font-medium text-muted-foreground">Admin Portal</div>
          <div class="flex-1"></div>
          <a hlmBtn variant="ghost" size="icon" routerLink="/dashboard">
            <ng-icon name="lucideArrowLeft" size="16" />
          </a>
        </header>
        <div class="flex-1 p-6">
          <router-outlet />
        </div>
      </main>
    </hlm-sidebar-wrapper>
  `,
})
export class AdminShell {
  private readonly auth = inject(AuthService);
  readonly navItems = [
    { path: '/admin', label: 'Dashboard', icon: 'lucideLayoutDashboard' },
    { path: '/admin/route-analytics', label: 'Route Analytics', icon: 'lucideRoute' },
    { path: '/admin/funnel', label: 'Conversion Funnel', icon: 'lucideGitFork' },
    { path: '/admin/users', label: 'Users', icon: 'lucideUsers' },
    { path: '/admin/trips', label: 'Trips', icon: 'lucideMapPin' },
    { path: '/admin/hotels', label: 'Hotels', icon: 'lucideHotel' },
    { path: '/admin/buses', label: 'Transport', icon: 'lucideBus' },
    { path: '/admin/partners', label: 'Partners', icon: 'lucideBriefcase' },
    { path: '/admin/approvals', label: 'Approvals', icon: 'lucideBadgeCheck', badge: 7 },
    { path: '/admin/reports', label: 'Reports', icon: 'lucideBarChart2' },
  ];
  logout(): void { this.auth.logout(); }
}
