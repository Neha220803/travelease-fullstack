import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmSidebarService } from '@spartan-ng/helm/sidebar';
import { AuthService } from '@app/core/auth/auth.service';

@Component({
  selector: 'app-hotel-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIconComponent, HlmButtonImports, HlmSidebarImports],
  providers: [HlmSidebarService],
  template: `
    <hlm-sidebar-wrapper>
      <hlm-sidebar collapsible="icon">
        <hlm-sidebar-header class="border-b border-sidebar-border">
          <div class="flex items-center gap-2 px-2 py-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                 style="background: oklch(0.6 0.13 30)">
              <ng-icon name="lucideHotel" class="text-white" size="16" />
            </div>
            <div class="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
              <span class="text-sm font-bold text-sidebar-foreground">Hotel Portal</span>
              <span class="text-xs text-muted-foreground">TravelEase</span>
            </div>
          </div>
        </hlm-sidebar-header>
        <hlm-sidebar-content>
          <hlm-sidebar-group>
            <div hlmSidebarGroupLabel class="group-data-[collapsible=icon]:hidden">Manage</div>
            <div hlmSidebarGroupContent>
              <ul hlmSidebarMenu>
                @for (item of navItems; track item.path) {
                  <li hlmSidebarMenuItem>
                    <a hlmSidebarMenuButton [routerLink]="item.path" routerLinkActive #rla="routerLinkActive" [isActive]="rla.isActive" [tooltip]="item.label">
                      <ng-icon [name]="item.icon" size="16" />
                      <span class="group-data-[collapsible=icon]:hidden">{{ item.label }}</span>
                    </a>
                  </li>
                }
              </ul>
            </div>
          </hlm-sidebar-group>
        </hlm-sidebar-content>
        <hlm-sidebar-footer class="border-t border-sidebar-border p-2">
          <button hlmBtn variant="ghost" class="w-full justify-start gap-2" (click)="logout()">
            <ng-icon name="lucideLogOut" size="14" />
            <span class="group-data-[collapsible=icon]:hidden">Sign Out</span>
          </button>
        </hlm-sidebar-footer>
        <button hlmSidebarRail></button>
      </hlm-sidebar>
      <main hlmSidebarInset>
        <header class="h-14 flex items-center gap-3 px-4 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-20">
          <button hlmSidebarTrigger class="-ml-1"></button>
          <span class="text-sm font-medium text-muted-foreground">Hotel Provider</span>
          <div class="flex-1"></div>
        </header>
        <div class="flex-1 p-6"><router-outlet /></div>
      </main>
    </hlm-sidebar-wrapper>
  `,
})
export class HotelShell {
  private readonly auth = inject(AuthService);
  readonly navItems = [
    { path: '/hotel', label: 'Dashboard', icon: 'lucideLayoutDashboard' },
    { path: '/hotel/properties', label: 'Properties', icon: 'lucideBuilding2' },
    { path: '/hotel/rooms', label: 'Rooms', icon: 'lucideBed' },
    { path: '/hotel/bookings', label: 'Bookings', icon: 'lucideCalendarCheck' },
    { path: '/hotel/reviews', label: 'Reviews', icon: 'lucideStar' },
    { path: '/hotel/reports', label: 'Reports', icon: 'lucideBarChart2' },
  ];
  logout(): void { this.auth.logout(); }
}
