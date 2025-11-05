import { notificationApi } from './http';

import type { NotificationDetailResponse, NotificationListResponse } from '@/types/notifications';
import { toNotificationItem, toNotificationListResponse } from '@/utils/notificationMapper';

export interface FetchNotificationsParams {
  cursorTimestamp?: string;
  cursorId?: string;
  limit?: number;
}

export const fetchNotifications = async (
  params: FetchNotificationsParams = {},
): Promise<NotificationListResponse> => {
  const response = await notificationApi.get('/api/notifications', {
    params: {
      limit: params.limit ?? 20,
      ...(params.cursorTimestamp ? { cursor_timestamp: params.cursorTimestamp } : {}),
      ...(params.cursorId ? { cursor_id: params.cursorId } : {}),
    },
  });
  return toNotificationListResponse(response.data);
};

export const fetchNotificationDetail = async (
  eventId: string,
): Promise<NotificationDetailResponse> => {
  const response = await notificationApi.get(`/api/notifications/${eventId}`);
  return toNotificationItem(response.data?.data ?? response.data);
};

export const markNotificationRead = async (eventId: string): Promise<void> => {
  await notificationApi.patch(`/api/notifications/${eventId}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await notificationApi.patch('/api/notifications/read-all');
};

export const deleteNotification = async (eventId: string): Promise<void> => {
  await notificationApi.delete(`/api/notifications/${eventId}`);
};

export const deleteAllNotifications = async (): Promise<void> => {
  await notificationApi.delete('/api/notifications');
};
