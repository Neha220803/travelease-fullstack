export interface NotificationResponse {
  notificationId: string;
  userId: string;
  notificationType: string;
  title: string;
  message: string;
  isRead: boolean;
  createdDate: string;
}
