import { threadlyApi } from '@/api/http';
import type {
  FeedResponse,
  CreatePostPayload,
  FeedPost,
  UploadedPostImage,
  PostCommentsPage,
  PostComment,
  UpdatePostResult,
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

export const fetchUserPosts = async (
  userId: string,
  params: FeedParams = {},
): Promise<FeedResponse> => {
  const response = await threadlyApi.get(`/api/users/${userId}/posts`, {
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
  await threadlyApi.post('/api/posts', {
    content: payload.content,
    images: (payload.images ?? []).map((image) => ({
      image_id: image.imageId,
      image_order: image.imageOrder,
    })),
  });
};

export const uploadPostImages = async (files: File[]): Promise<UploadedPostImage[]> => {
  if (!files || files.length === 0) {
    return [];
  }

  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));

  const response = await threadlyApi.post('/api/post-images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  const data = unwrapThreadlyResponse<Record<string, unknown>>(response.data);
  const rawImages = Array.isArray(data['images']) ? data['images'] : [];

  return rawImages
    .map((raw): UploadedPostImage | null => {
      if (raw && typeof raw === 'object') {
        const record = raw as Record<string, unknown>;
        const imageId = record['image_id'];
        const imageUrl = record['image_url'];
        if (typeof imageId === 'string') {
          return {
            imageId,
            imageUrl: typeof imageUrl === 'string' ? imageUrl : '',
          };
        }
      }
      return null;
    })
    .filter((image): image is UploadedPostImage => Boolean(image));
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

export const updatePost = async (postId: string, content: string): Promise<UpdatePostResult> => {
  const response = await threadlyApi.patch(`/api/posts/${postId}`, { content });
  const data = unwrapThreadlyResponse<Record<string, unknown>>(response.data);

  return {
    postId: (data['postId'] ?? data['post_id'] ?? '').toString(),
    userId: (data['userId'] ?? data['user_id'] ?? '').toString(),
    userNickname: (data['userNickname'] ?? data['user_nickname'] ?? '').toString(),
    userProfileImageUrl: normalizeProfileImageUrl(
      (data['userProfileImageUrl'] ?? data['user_profile_image_url'] ?? undefined) as string | undefined,
    ),
    content: (data['content'] ?? '').toString(),
    viewCount: Number(data['viewCount'] ?? data['view_count'] ?? 0),
    postedAt: data['postedAt']?.toString() ?? data['posted_at']?.toString() ?? '',
    likeCount: Number(data['likeCount'] ?? data['like_count'] ?? 0),
    commentCount: Number(data['commentCount'] ?? data['comment_count'] ?? 0),
    liked: Boolean(data['liked'] ?? data['isLiked'] ?? data['is_liked'] ?? false),
  };
};

export const deletePost = async (postId: string): Promise<void> => {
  await threadlyApi.delete(`/api/posts/${postId}`);
};
