import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { NotificationsDummyService } from '@app/core/services/notifications-dummy.service';
import { Notification, DepartureSuggestion } from '@app/core/models/notification.model';

const NOTIF_ICONS: Record<string, string> = {
  TRIP_INVITATION:     'lucideMail',
  INVITATION_ACCEPTED: 'lucideUserCheck',
  INVITATION_REJECTED: 'lucideUserX',
  ACTIVITY_REMINDER:   'lucideClock',
  DEPARTURE_ALERT:     'lucidePlane',
  EXPENSE_ADDED:       'lucideReceipt',
  SETTLEMENT_PAID:     'lucideCreditCard',
  DELAY_REPORTED:      'lucideAlertTriangle',
  SYSTEM:              'lucideInfo',
};

@Component({
  selector: 'app-notifications',
  imports: [RouterLink, DatePipe, NgIconComponent, HlmButtonImports, HlmSkeletonImports, HlmBadgeImports],
  template: `
    <div class="max-w-2xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Notifications</h1>
          <p class="text-muted-foreground text-sm mt-0.5">{{ unreadCount() }} unread</p>
        </div>
        <button hlmBtn variant="outline" size="sm" (click)="markAllRead()" [disabled]="unreadCount() === 0">
          <ng-icon name="lucideCheckCircle" size="14" class="mr-1.5" />
          Mark all read
        </button>
      </div>

      <!-- Departure suggestions -->
      @if (suggestions().length > 0) {
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h2 class="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <ng-icon name="lucidePlane" size="14" />
            Departure Suggestions
          </h2>
          <div class="space-y-3">
            @for (s of suggestions(); track s.id) {
              <div class="bg-white rounded-lg p-3 border border-amber-100">
                <div class="text-sm font-medium text-foreground">{{ s.message }}</div>
                <div class="text-xs text-muted-foreground mt-1">
                  {{ s.tripName }} · {{ s.activityName }} at {{ s.activityTime }}
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Notifications list -->
      @if (loading()) {
        <div class="space-y-3">
          @for (_ of [1,2,3]; track $index) {
            <div class="bg-card border border-border rounded-xl p-4 flex gap-3">
              <hlm-skeleton class="w-10 h-10 rounded-lg flex-shrink-0" />
              <div class="flex-1 space-y-2">
                <hlm-skeleton class="h-4 w-3/4 rounded" />
                <hlm-skeleton class="h-3 w-full rounded" />
              </div>
            </div>
          }
        </div>
      } @else if (notifications().length === 0) {
        <div class="text-center py-16">
          <ng-icon name="lucideBell" size="40" class="text-muted-foreground mx-auto mb-3" />
          <h3 class="font-semibold">All caught up!</h3>
          <p class="text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      } @else {
        <div class="space-y-2">
          @for (notif of notifications(); track notif.id) {
            <div class="flex items-start gap-3 bg-card border border-border rounded-xl p-4 transition-colors"
                 [class.opacity-60]="notif.read">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                   [class]="notif.read ? 'bg-muted' : 'bg-primary/10'">
                <ng-icon [name]="getIcon(notif.type)" size="16"
                         [class]="notif.read ? 'text-muted-foreground' : 'text-primary'" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <div class="text-sm font-medium">{{ notif.title }}</div>
                  @if (!notif.read) {
                    <div class="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5"></div>
                  }
                </div>
                <div class="text-xs text-muted-foreground mt-0.5">{{ notif.message }}</div>
                <div class="text-xs text-muted-foreground/60 mt-1">{{ notif.createdAt | date:'MMM d, h:mm a' }}</div>
              </div>
              @if (!notif.read) {
                <button hlmBtn variant="ghost" size="icon-sm" (click)="markRead(notif.id)" title="Mark as read">
                  <ng-icon name="lucideCheck" size="12" />
                </button>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class Notifications implements OnInit {
  private readonly service = inject(NotificationsDummyService);

  readonly loading = signal(true);
  readonly notifications = signal<Notification[]>([]);
  readonly suggestions = signal<DepartureSuggestion[]>([]);
  readonly unreadCount = () => this.notifications().filter(n => !n.read).length;

  ngOnInit(): void {
    this.service.getNotifications().subscribe(n => {
      this.notifications.set(n);
      this.loading.set(false);
    });
    this.service.getDepartureSuggestions().subscribe(s => this.suggestions.set(s));
  }

  getIcon(type: string): string {
    return NOTIF_ICONS[type] ?? 'lucideInfo';
  }

  markRead(id: string): void {
    this.service.markRead(id).subscribe(() => {
      this.notifications.update(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
    });
  }

  markAllRead(): void {
    this.notifications.update(ns => ns.map(n => ({ ...n, read: true })));
  }
}
