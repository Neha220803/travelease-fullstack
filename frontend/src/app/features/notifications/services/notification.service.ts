import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { AuthService } from '@app/core/auth/auth.service';
import { NotificationResponse } from './notification.models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /** Live unread count shared across the sidebar badge and the Notifications page. */
  public readonly unreadCount = signal(0);

  getNotifications(isRead?: boolean, type?: string): Observable<NotificationResponse[]> {
    let params = new HttpParams();
    const userId = this.authService.currentUser()?.id;
    if (userId) params = params.set('userId', userId);
    if (isRead !== undefined) params = params.set('isRead', isRead);
    if (type) params = params.set('type', type);

    return this.http.get<NotificationResponse[]>(`${API_BASE_URL}/api/notifications`, { params });
  }

  markAsRead(notificationId: string): Observable<NotificationResponse> {
    return this.http.put<NotificationResponse>(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {});
  }

  refreshUnreadCount(): void {
    this.getNotifications(false).subscribe({
      next: (notifications) => this.unreadCount.set(notifications.length),
      error: () => {},
    });
  }

  decrementUnreadCount(): void {
    this.unreadCount.update((count) => Math.max(0, count - 1));
  }
}
