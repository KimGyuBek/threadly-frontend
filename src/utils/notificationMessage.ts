import type { NotificationItem } from '@/types/notifications';

export interface NotificationText {
  title: string;
  description: string;
}

export const buildNotificationText = (notification: NotificationItem): NotificationText => {
  const actor = notification.actorProfile.nickname || '알 수 없는 사용자';
  switch (notification.notificationType) {
    case 'POST_LIKE': {
      const meta = notification.metadata.type === 'POST_LIKE' ? notification.metadata : undefined;
      return {
        title: `${actor}님이 게시글을 좋아합니다`,
        description: meta?.postTitle ? `게시글: ${meta.postTitle}` : '게시글에 새로운 좋아요가 있습니다.',
      };
    }
    case 'COMMENT_ADDED': {
      const meta = notification.metadata.type === 'COMMENT_ADDED' ? notification.metadata : undefined;
      return {
        title: `${actor}님이 새 댓글을 남겼습니다`,
        description: meta?.commentExcerpt ?? meta?.commentContent ?? '댓글 내용을 확인하세요.',
      };
    }
    case 'COMMENT_LIKE': {
      return {
        title: `${actor}님이 댓글을 좋아합니다`,
        description: '댓글에 새로운 좋아요가 있습니다.',
      };
    }
    case 'FOLLOW_REQUEST':
      return {
        title: `${actor}님이 팔로우를 요청했습니다`,
        description: '요청을 확인하세요.',
      };
    case 'FOLLOW':
      return {
        title: `${actor}님이 회원님을 팔로우합니다`,
        description: '새로운 팔로워를 확인하세요.',
      };
    case 'FOLLOW_ACCEPT':
      return {
        title: `${actor}님이 팔로우 요청을 수락했습니다`,
        description: '새로운 연결이 생성되었습니다.',
      };
    default:
      return {
        title: '새로운 알림',
        description: '세부 정보를 확인하세요.',
      };
  }
};
