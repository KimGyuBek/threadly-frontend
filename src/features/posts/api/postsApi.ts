import { threadlyApi } from '@/api/http';
import type {
  FeedResponse,
  CreatePostPayload,
  FeedPost,
  PostCommentsPage,
} from '../types';
import { toFeedResponse, toFeedPost, toPostCommentsPage } from '@/utils/postMapper';
import type { AxiosRequestConfig } from 'axios';

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

export const likePost = async (postId: string): Promise<void> => {
  await threadlyApi.post(`/api/posts/${postId}/likes`);
};

export const unlikePost = async (postId: string): Promise<void> => {
  await threadlyApi.delete(`/api/posts/${postId}/likes`);
};
