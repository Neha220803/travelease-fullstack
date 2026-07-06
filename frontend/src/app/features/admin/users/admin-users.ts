import { Component, inject, OnInit, signal } from '@angular/core';
import { SlicePipe, TitleCasePipe } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { AdminDummyService } from '@app/core/services/admin-dummy.service';
import { User } from '@app/core/models/user.model';
import { StatusBadge } from '@app/shared/components/status-badge/status-badge';
import { EmptyState } from '@app/shared/components/empty-state/empty-state';

@Component({
  selector: 'app-admin-users',
  imports: [SlicePipe, TitleCasePipe, NgIconComponent, HlmButtonImports, HlmSkeletonImports, StatusBadge, EmptyState],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Users</h1>
          <p class="text-muted-foreground text-sm mt-0.5">{{ users().length }} registered users</p>
        </div>
        <div class="flex gap-2">
          <div class="relative">
            <ng-icon name="lucideSearch" size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search users..."
                   class="h-9 pl-8 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-52"
                   (input)="search.set($any($event.target).value)" />
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="space-y-2">
          @for (_ of [1,2,3,4]; track $index) {
            <div class="bg-card border border-border rounded-xl p-4 flex gap-4 items-center">
              <hlm-skeleton class="w-10 h-10 rounded-full flex-shrink-0" />
              <div class="flex-1 space-y-2">
                <hlm-skeleton class="h-4 w-48 rounded" />
                <hlm-skeleton class="h-3 w-32 rounded" />
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="bg-card border border-border rounded-xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-muted/50">
                <tr>
                  <th class="text-left p-4 font-medium text-muted-foreground">User</th>
                  <th class="text-left p-4 font-medium text-muted-foreground">Phone</th>
                  <th class="text-left p-4 font-medium text-muted-foreground">Role</th>
                  <th class="text-left p-4 font-medium text-muted-foreground">Joined</th>
                  <th class="text-right p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (user of filteredUsers(); track user.id) {
                  <tr class="border-t border-border hover:bg-muted/30 transition-colors">
                    <td class="p-4">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                          {{ user.name.charAt(0) }}
                        </div>
                        <div>
                          <div class="font-medium">{{ user.name }}</div>
                          <div class="text-xs text-muted-foreground">{{ user.email }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="p-4 text-muted-foreground">{{ user.phone }}</td>
                    <td class="p-4">
                      <span class="text-xs font-medium px-2 py-0.5 rounded-full"
                            [class]="roleClass(user.role)">{{ user.role }}</span>
                    </td>
                    <td class="p-4 text-muted-foreground text-xs">{{ user.createdAt | slice:0:10 }}</td>
                    <td class="p-4 text-right">
                      <button hlmBtn variant="ghost" size="icon-sm" title="View">
                        <ng-icon name="lucideEye" size="14" />
                      </button>
                      <button hlmBtn variant="ghost" size="icon-sm" title="Deactivate">
                        <ng-icon name="lucideUserX" size="14" />
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminUsers implements OnInit {
  private readonly service = inject(AdminDummyService);

  readonly loading = signal(true);
  readonly users = signal<User[]>([]);
  readonly search = signal('');

  readonly filteredUsers = () => {
    const q = this.search().toLowerCase();
    return q ? this.users().filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : this.users();
  };

  ngOnInit(): void {
    this.service.getUsers().subscribe(users => {
      this.users.set(users);
      this.loading.set(false);
    });
  }

  roleClass(role: string): string {
    const map: Record<string, string> = {
      ADMIN: 'bg-purple-100 text-purple-800',
      TRAVELER: 'bg-primary/10 text-primary',
      HOTEL_PROVIDER: 'bg-amber-100 text-amber-800',
      TRANSPORT_PROVIDER: 'bg-blue-100 text-blue-800',
      ACTIVITY_PROVIDER: 'bg-green-100 text-green-800',
    };
    return map[role] ?? 'bg-muted text-muted-foreground';
  }
}
