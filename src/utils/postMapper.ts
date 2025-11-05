import type { FeedPost, PostAuthor, PostImage, FeedResponse, PostsCursor } from '@/features/posts/types';
import { unwrapThreadlyResponse } from './api';

const mapAuthor = (raw: unknown, fallbackUserId?: string): PostAuthor => {
  if (raw && typeof raw === 'object') {
    const data = raw as Record<string, unknown>;
    const userId = (data['userId'] ?? data['user_id'] ?? fallbackUserId ?? '').toString();
    return {
      userId,
      nickname: (data['nickname'] ?? data['nickName'] ?? '').toString(),
      profileImageUrl:
        (data['profileImageUrl'] ?? data['profile_image_url'] ?? undefined) as string | undefined,
    };
  }
  return {
    userId: fallbackUserId ?? '',
    nickname: '',
  };
};

const mapImages = (raw: unknown): PostImage[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item, index) => {
    if (!item || typeof item !== 'object') {
      return {
        imageId: `${index}`,
        imageUrl: '',
        imageOrder: index,
      };
    }
    const data = item as Record<string, unknown>;
    return {
      imageId: (data['imageId'] ?? data['image_id'] ?? `${index}`).toString(),
      imageUrl: (data['imageUrl'] ?? data['image_url'] ?? '').toString(),
      imageOrder: Number(data['imageOrder'] ?? data['image_order'] ?? index),
    };
  });
};

export const toFeedPost = (raw: unknown): FeedPost => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid post payload');
  }
  const data = raw as Record<string, unknown>;
  const userId = (data['userId'] ?? data['user_id'] ?? '').toString();
  const authorRaw =
    data['author'] ??
    data['authorProfile'] ??
    data['author_profile'] ??
    data['userProfile'] ??
    data['user_profile'];

  return {
    postId: (data['postId'] ?? data['post_id'] ?? '').toString(),
    userId,
    content: (data['content'] ?? '').toString(),
    viewCount: Number(data['viewCount'] ?? data['view_count'] ?? 0),
    status: (data['status'] ?? '').toString(),
    postedAt: data['postedAt']?.toString() ?? data['posted_at']?.toString() ?? '',
    author: mapAuthor(authorRaw, userId),
    images: mapImages(data['images']),
    likeCount: Number(data['likeCount'] ?? data['like_count'] ?? 0),
    commentCount: Number(data['commentCount'] ?? data['comment_count'] ?? 0),
    isLiked: Boolean(data['isLiked'] ?? data['is_liked'] ?? false),
  };
};

export const toFeedResponse = (payload: unknown): FeedResponse => {
  const data = unwrapThreadlyResponse<{ content?: unknown[]; hasNext?: boolean; nextCursor?: unknown }>(
    payload,
  );
  const content = Array.isArray(data.content) ? data.content.map(toFeedPost) : [];
  let nextCursor: PostsCursor | undefined;
  if (data.nextCursor && typeof data.nextCursor === 'object') {
    const cursor = data.nextCursor as Record<string, unknown>;
    const timestamp = cursor['timestamp']?.toString();
    const id = cursor['id']?.toString();
    if (timestamp && id) {
      nextCursor = { timestamp, id };
    }
  }
  return {
    content,
    hasNext: Boolean(data.hasNext),
    nextCursor,
  };
};
