export type NotificationType =
  | 'POST_LIKE'
  | 'COMMENT_ADDED'
  | 'COMMENT_LIKE'
  | 'FOLLOW_REQUEST'
  | 'FOLLOW'
  | 'FOLLOW_ACCEPT'
  | 'UNKNOWN';

export interface ActorProfile {
  userId: string;
  nickname: string;
  profileImageUrl?: string;
}

export interface NotificationPreview {
  title: string;
  body: string;
  imageUrl?: string | null;
}

export interface BaseMetadata {
  type: NotificationType;
}

export interface PostLikeMetadata extends BaseMetadata {
  type: 'POST_LIKE';
  postId: string;
  postTitle?: string;
}

export interface CommentMetadataBase extends BaseMetadata {
  postId: string;
  commentId: string;
  commentContent?: string;
}

export interface CommentAddedMetadata extends CommentMetadataBase {
  type: 'COMMENT_ADDED';
  commentExcerpt?: string;
}

export interface CommentLikeMetadata extends CommentMetadataBase {
  type: 'COMMENT_LIKE';
}

export interface FollowRequestMetadata extends BaseMetadata {
  type: 'FOLLOW_REQUEST';
}

export interface FollowMetadata extends BaseMetadata {
  type: 'FOLLOW';
}

export interface FollowAcceptMetadata extends BaseMetadata {
  type: 'FOLLOW_ACCEPT';
}

export interface UnknownMetadata extends BaseMetadata {
  type: 'UNKNOWN';
}

export type NotificationMetadata =
  | PostLikeMetadata
  | CommentAddedMetadata
  | CommentLikeMetadata
  | FollowRequestMetadata
  | FollowMetadata
  | FollowAcceptMetadata
  | UnknownMetadata;

export interface NotificationItem {
  eventId: string;
  receiverId: string;
  notificationType: NotificationType;
  occurredAt: string;
  isRead: boolean;
  actorProfile: ActorProfile;
  metadata: NotificationMetadata;
  preview?: NotificationPreview;
  sortId?: string;
}

export interface NotificationCursor {
  timestamp: string;
  id: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  hasNext: boolean;
  nextCursor?: NotificationCursor | null;
}

export type NotificationDetailResponse = NotificationItem;

export interface NotificationWebSocketMessage {
  type: 'NOTIFICATION' | 'ACK' | 'RESYNC' | string;
  eventId?: string;
  sortId?: string;
  occurredAt?: string;
  payload?: {
    notificationType?: NotificationType;
    metadata?: Partial<NotificationMetadata> & Record<string, unknown>;
    preview?: NotificationPreview;
  };
}
