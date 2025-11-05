import type {
  ActorProfile,
  NotificationItem,
  NotificationListResponse,
  NotificationMetadata,
  NotificationPreview,
  NotificationType,
} from '@/types/notifications';

import { unwrapThreadlyResponse } from './api';

const normalizeType = (value: unknown): NotificationType => {
  switch ((value ?? '').toString().toUpperCase()) {
    case 'POST_LIKE':
      return 'POST_LIKE';
    case 'COMMENT_ADDED':
      return 'COMMENT_ADDED';
    case 'COMMENT_LIKE':
      return 'COMMENT_LIKE';
    case 'FOLLOW_REQUEST':
      return 'FOLLOW_REQUEST';
    case 'FOLLOW':
      return 'FOLLOW';
    case 'FOLLOW_ACCEPT':
      return 'FOLLOW_ACCEPT';
    default:
      return 'UNKNOWN';
  }
};

const mapActorProfile = (raw: unknown): ActorProfile => {
  if (raw && typeof raw === 'object') {
    const data = raw as Record<string, unknown>;
    return {
      userId: (data['userId'] ?? '').toString(),
      nickname: (data['nickname'] ?? '').toString(),
      profileImageUrl: data['profileImageUrl']?.toString() ?? undefined,
    };
  }
  return { userId: '', nickname: '' };
};

const mapPreview = (raw: unknown): NotificationPreview | undefined => {
  if (raw && typeof raw === 'object') {
    const data = raw as Record<string, unknown>;
    const title = data['title']?.toString();
    const body = data['body']?.toString();
    if (title && body) {
      return {
        title,
        body,
        imageUrl: data['imageUrl']?.toString(),
      };
    }
  }
  return undefined;
};

const mapMetadata = (raw: unknown, fallbackType: NotificationType): NotificationMetadata => {
  if (raw && typeof raw === 'object') {
    const data = raw as Record<string, unknown>;
    const type = normalizeType(data['type'] ?? fallbackType);

    switch (type) {
      case 'POST_LIKE':
        return {
          type,
          postId: (data['postId'] ?? '').toString(),
          postTitle: data['postTitle']?.toString(),
        };
      case 'COMMENT_ADDED':
        return {
          type,
          postId: (data['postId'] ?? '').toString(),
          commentId: (data['commentId'] ?? '').toString(),
          commentContent: data['commentContent']?.toString(),
          commentExcerpt: data['commentExcerpt']?.toString(),
        };
      case 'COMMENT_LIKE':
        return {
          type,
          postId: (data['postId'] ?? '').toString(),
          commentId: (data['commentId'] ?? '').toString(),
          commentContent: data['commentContent']?.toString(),
        };
      case 'FOLLOW_REQUEST':
      case 'FOLLOW':
      case 'FOLLOW_ACCEPT':
        return { type };
      default:
        return { type: 'UNKNOWN' };
    }
  }
  if (fallbackType === 'POST_LIKE') {
    return { type: 'POST_LIKE', postId: '' };
  }
  if (fallbackType === 'COMMENT_ADDED') {
    return { type: 'COMMENT_ADDED', postId: '', commentId: '' };
  }
  if (fallbackType === 'COMMENT_LIKE') {
    return { type: 'COMMENT_LIKE', postId: '', commentId: '' };
  }
  if (fallbackType === 'FOLLOW_REQUEST') {
    return { type: 'FOLLOW_REQUEST' };
  }
  if (fallbackType === 'FOLLOW') {
    return { type: 'FOLLOW' };
  }
  if (fallbackType === 'FOLLOW_ACCEPT') {
    return { type: 'FOLLOW_ACCEPT' };
  }
  return { type: 'UNKNOWN' };
};

export const toNotificationItem = (raw: unknown): NotificationItem => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid notification payload');
  }
  const data = raw as Record<string, unknown>;
  const notificationType = normalizeType(data['notificationType'] ?? data['type']);
  const metadataRaw = data['metaData'] ?? data['metadata'];
  const previewRaw = data['preview'];

  return {
    eventId: (data['eventId'] ?? '').toString(),
    receiverId: (data['receiverId'] ?? '').toString(),
    notificationType,
    occurredAt: data['occurredAt']?.toString() ?? new Date().toISOString(),
    isRead: Boolean(data['isRead']),
    actorProfile: mapActorProfile(data['actorProfile']),
    metadata: mapMetadata(metadataRaw, notificationType),
    preview: mapPreview(previewRaw),
    sortId: data['sortId']?.toString(),
  };
};

export const toNotificationListResponse = (payload: unknown): NotificationListResponse => {
  const data = unwrapThreadlyResponse<{ items?: unknown[]; hasNext?: boolean; nextCursor?: unknown }>(payload);
  const items = Array.isArray(data?.items) ? data.items : [];
  const mappedItems = items.map((item) => toNotificationItem(item));

  let nextCursor = undefined;
  if (data?.nextCursor && typeof data.nextCursor === 'object') {
    const cursor = data.nextCursor as Record<string, unknown>;
    const timestamp = cursor['timestamp']?.toString();
    const id = cursor['id']?.toString();
    if (timestamp && id) {
      nextCursor = { timestamp, id };
    }
  }

  return {
    items: mappedItems,
    hasNext: Boolean(data?.hasNext),
    nextCursor: nextCursor ?? null,
  };
};
