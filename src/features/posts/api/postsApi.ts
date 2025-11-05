import { threadlyApi } from '@/api/http';
import type { FeedResponse, CreatePostPayload, FeedPost } from '../types';
import { toFeedResponse, toFeedPost } from '@/utils/postMapper';

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

export const likePost = async (postId: string): Promise<void> => {
  await threadlyApi.post(`/api/posts/${postId}/likes`);
};

export const unlikePost = async (postId: string): Promise<void> => {
  await threadlyApi.delete(`/api/posts/${postId}/likes`);
};
