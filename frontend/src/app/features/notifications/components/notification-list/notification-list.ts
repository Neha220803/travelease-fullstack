import { Component, OnInit, inject, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { DatePipe, NgClass } from '@angular/common';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { PageHeader } from '@app/shared/ui/page-header/page-header';
import { NotificationService } from '../../services/notification.service';
import { NotificationResponse } from '../../services/notification.models';

const ICON_FOR: Record<string, string> = {
  INVITATION: 'lucideMail',
  EXPENSE: 'lucideWallet',
  BUDGET: 'lucideAlertTriangle',
  DELAY: 'lucideBellRing',
  BOOKING: 'lucideCheckCircle2',
};

export function iconForNotificationType(type: string): string {
  return ICON_FOR[type] ?? 'lucideBellRing';
}

@Component({
  selector: 'app-notification-list',
  imports: [NgIcon, HlmCardImports, HlmButtonImports, PageHeader, DatePipe, NgClass],
  templateUrl: './notification-list.html',
})
export class NotificationList implements OnInit {
  private readonly notificationService = inject(NotificationService);
  
  protected readonly notifications = signal<NotificationResponse[]>([]);
  protected readonly isLoading = signal(true);
  
  ngOnInit() {
    this.loadNotifications();
  }
  
  private loadNotifications() {
    this.isLoading.set(true);
    this.notificationService.getNotifications().subscribe({
      next: (data) => {
        this.notifications.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  protected getIcon(type: string): string {
    return iconForNotificationType(type);
  }

  protected markAsRead(notification: NotificationResponse) {
    if (notification.isRead) return;
    this.notificationService.markAsRead(notification.notificationId).subscribe({
      next: (updated) => {
        this.notifications.update(list => 
          list.map(n => n.notificationId === updated.notificationId ? updated : n)
        );
      }
    });
  }
}
