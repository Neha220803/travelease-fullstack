import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@app/core/api/api-config';
import { NotificationResponse } from './notification.models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);

  getNotifications(isRead?: boolean, type?: string): Observable<NotificationResponse[]> {
    let params = new HttpParams();
    if (isRead !== undefined) params = params.set('isRead', isRead);
    if (type) params = params.set('type', type);

    return this.http.get<NotificationResponse[]>(`${API_BASE_URL}/api/notifications`, { params });
  }

  markAsRead(notificationId: string): Observable<NotificationResponse> {
    return this.http.put<NotificationResponse>(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {});
  }
}
