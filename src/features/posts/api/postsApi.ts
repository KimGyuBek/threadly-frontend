import { threadlyApi } from '@/api/http';
import type {
  FeedResponse,
  CreatePostPayload,
  FeedPost,
  PostCommentsPage,
  PostComment,
} from '../types';
import { toFeedResponse, toFeedPost, toPostCommentsPage } from '@/utils/postMapper';
import type { AxiosRequestConfig } from 'axios';
import { unwrapThreadlyResponse } from '@/utils/api';
import { normalizeProfileImageUrl } from '@/utils/profileImage';

interface FeedParams {
  cursorTimestamp?: string;
  cursorId?: string;
  limit?: number;
}

export const fetchFeed = async (params: FeedParams = {}): Promise<FeedResponse> => {
  const response = await threadlyApi.get('/api/posts', {
    params: {
      limit: params.limit ?? 10,
      ...(params.cursorTimestamp ? { cursor_timestamp: params.cursorTimestamp } : {}),
      ...(params.cursorId ? { cursor_id: params.cursorId } : {}),
    },
  });
  return toFeedResponse(response.data);
};

export const searchPosts = async (query: string): Promise<FeedResponse> => {
  const response = await threadlyApi.get('/api/posts/search', {
    params: {
      keyword: query,
      limit: 20,
    },
  });
  return toFeedResponse(response.data);
};

export const createPost = async (payload: CreatePostPayload): Promise<void> => {
  await threadlyApi.post('/api/posts', payload);
};

export const fetchPostDetail = async (postId: string): Promise<FeedPost> => {
  const response = await threadlyApi.get(`/api/posts/${postId}`);
  return toFeedPost(response.data?.data ?? response.data);
};

export const fetchPostEngagement = async (
  postId: string,
): Promise<{ likeCount: number; liked: boolean }> => {
  const response = await threadlyApi.get(`/api/posts/${postId}/engagement`);
  const data = unwrapThreadlyResponse<Record<string, unknown>>(response.data);
  return {
    likeCount: Number(data['likeCount'] ?? data['like_count'] ?? 0),
    liked: Boolean(data['liked'] ?? false),
  };
};

interface PostCommentsParams {
  cursorTimestamp?: string;
  cursorId?: string;
  limit?: number;
}

export const fetchPostComments = async (
  postId: string,
  params: PostCommentsParams = {},
): Promise<PostCommentsPage> => {
  const response = await threadlyApi.get(`/api/posts/${postId}/comments`, {
    params: {
      ...(params.cursorTimestamp ? { cursor_timestamp: params.cursorTimestamp } : {}),
      ...(params.cursorId ? { cursor_id: params.cursorId } : {}),
      limit: params.limit ?? 10,
    },
    skipAuthRetry: true,
  } as AxiosRequestConfig & { skipAuthRetry: boolean });

  return toPostCommentsPage(response.data);
};

export const createPostComment = async (postId: string, content: string): Promise<PostComment> => {
  const response = await threadlyApi.post(`/api/posts/${postId}/comments`, { content });
  const data = unwrapThreadlyResponse<Record<string, unknown>>(response.data);
  const commentId = (data['commentId'] ?? data['comment_id'] ?? '').toString();
  const userId = (data['userId'] ?? data['user_id'] ?? '').toString();
  const nickname = (data['userNickname'] ?? data['user_nickname'] ?? '').toString();
  const profileImageUrl = normalizeProfileImageUrl(
    (data['userProfileImageUrl'] ?? data['user_profile_image_url'] ?? undefined) as string | undefined,
  );
  return {
    postId,
    commentId,
    commenter: {
      userId,
      nickname,
      profileImageUrl,
    },
    commentedAt: data['createdAt']?.toString() ?? data['created_at']?.toString() ?? '',
    likeCount: 0,
    content: (data['content'] ?? '').toString(),
    liked: false,
  };
};

export interface CommentLikeResponse {
  commentId: string;
  likeCount: number;
}

const mapCommentLikeResponse = (payload: unknown): CommentLikeResponse => {
  const data = unwrapThreadlyResponse<Record<string, unknown>>(payload);
  const commentId = (data['commentId'] ?? data['comment_id'] ?? '').toString();
  const likeCount = Number(data['likeCount'] ?? data['like_count'] ?? 0);
  return { commentId, likeCount };
};

export const likeComment = async (postId: string, commentId: string): Promise<CommentLikeResponse> => {
  const response = await threadlyApi.post(`/api/posts/${postId}/comments/${commentId}/likes`);
  return mapCommentLikeResponse(response.data);
};

export const unlikeComment = async (
  postId: string,
  commentId: string,
): Promise<CommentLikeResponse> => {
  const response = await threadlyApi.delete(`/api/posts/${postId}/comments/${commentId}/likes`);
  return mapCommentLikeResponse(response.data);
};

export const likePost = async (postId: string): Promise<void> => {
  await threadlyApi.post(`/api/posts/${postId}/likes`);
};

export const unlikePost = async (postId: string): Promise<void> => {
  await threadlyApi.delete(`/api/posts/${postId}/likes`);
};
