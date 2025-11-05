import { threadlyApi } from '@/api/http';
import type {
  FollowStatus,
  FollowStats,
  FollowListParams,
  FollowListResult,
  FollowListUser,
  MyProfile,
  UserProfile,
} from '../types';
import type { AuthTokens } from '@/types/auth';
import { toProfile, toMyProfile } from '@/utils/profileMapper';
import { unwrapThreadlyResponse } from '@/utils/api';

export interface RegisterProfilePayload {
  nickname: string;
  statusMessage?: string;
  bio?: string;
  phone?: string;
  gender: string;
  profileImageUrl?: string;
}

export const fetchMyProfile = async (): Promise<MyProfile> => {
  const response = await threadlyApi.get('/api/me/profile');
  return toMyProfile(response.data);
};

export const registerProfile = async (payload: RegisterProfilePayload): Promise<AuthTokens> => {
  const response = await threadlyApi.post('/api/me/profile', payload);
  const data = unwrapThreadlyResponse<AuthTokens | { accessToken?: string; refreshToken?: string }>(
    response.data,
  );
  const normalizedTokens = data as AuthTokens;
  const rawRecord = data as Record<string, unknown>;
  const accessToken =
    normalizedTokens.accessToken ??
    (typeof rawRecord['access_token'] === 'string' ? (rawRecord['access_token'] as string) : undefined);
  const refreshToken =
    normalizedTokens.refreshToken ??
    (typeof rawRecord['refresh_token'] === 'string' ? (rawRecord['refresh_token'] as string) : undefined);
  if (!accessToken || !refreshToken) {
    throw new Error('프로필 설정 토큰 응답이 올바르지 않습니다.');
  }
  return { accessToken, refreshToken };
};

export const fetchUserProfile = async (userId: string): Promise<UserProfile> => {
  const response = await threadlyApi.get(`/api/users/profile/${userId}`);
  return toProfile(response.data);
};

export const fetchUserFollowStats = async (userId: string): Promise<FollowStats> => {
  const response = await threadlyApi.get(`/api/follows/${userId}/stats`);
  const data = unwrapThreadlyResponse<Record<string, unknown>>(response.data);
  return {
    followerCount: Number(data['followerCount'] ?? data['follower_count'] ?? 0),
    followingCount: Number(data['followingCount'] ?? data['following_count'] ?? 0),
  };
};

const mapFollowListUser = (payload: Record<string, unknown> | undefined): FollowListUser => {
  if (!payload) {
    return { userId: '', nickname: '' };
  }
  const userIdRaw = payload['userId'] ?? payload['user_id'];
  const userId =
    typeof userIdRaw === 'string'
      ? userIdRaw
      : userIdRaw != null
        ? String(userIdRaw)
        : '';
  return {
    userId,
    nickname: (payload['nickname'] ?? '').toString(),
    profileImageUrl: (payload['profileImageUrl'] ?? payload['profile_image_url'] ?? undefined) as
      | string
      | undefined,
  };
};

const mapFollowListResponse = (
  payload: unknown,
  userField: 'follower' | 'following',
  timestampField: 'followedAt' | 'followingAt',
): FollowListResult => {
  const data = (payload ?? {}) as Record<string, unknown>;
  const rawItems = (data['content'] ?? []) as unknown[];

  const users: FollowListUser[] = Array.isArray(rawItems)
    ? rawItems.map((item) => {
        const entry = (item ?? {}) as Record<string, unknown>;
        const nested = (entry[userField] ?? {}) as Record<string, unknown> | undefined;
        const timestampKey = timestampField.replace('At', '_at');
        const sinceRaw = entry[timestampField] ?? entry[timestampKey];
        const since =
          typeof sinceRaw === 'string'
            ? sinceRaw
            : sinceRaw != null
              ? String(sinceRaw)
              : null;
        return {
          ...mapFollowListUser(nested),
          since,
        };
      })
    : [];

  const next =
    (data['nextCursor'] as Record<string, unknown> | undefined) ??
    (data['next_cursor'] as Record<string, unknown> | undefined) ??
    null;

  const cursorTimestamp =
    (next?.['cursorTimestamp'] as string | null | undefined) ??
    (next?.['cursor_timestamp'] as string | null | undefined) ??
    null;
  const cursorId =
    (next?.['cursorId'] as string | null | undefined) ??
    (next?.['cursor_id'] as string | null | undefined) ??
    null;

  const sanitizedUsers = users.filter((user) => user.userId);

  return {
    users: sanitizedUsers,
    nextCursor:
      cursorTimestamp || cursorId
        ? {
            cursorTimestamp,
            cursorId,
          }
        : null,
  };
};

const buildFollowListParams = ({
  userId,
  cursorTimestamp,
  cursorId,
  limit = 20,
}: FollowListParams) => {
  const params: Record<string, string> = {
    limit: String(limit),
  };
  if (userId) {
    params['user_id'] = userId;
  }
  if (cursorTimestamp) {
    params['cursor_timestamp'] = cursorTimestamp;
  }
  if (cursorId) {
    params['cursor_id'] = cursorId;
  }
  return params;
};

export const fetchFollowersList = async (
  params: FollowListParams,
): Promise<FollowListResult> => {
  const response = await threadlyApi.get('/api/follows/followers', {
    params: buildFollowListParams(params),
  });
  const data = unwrapThreadlyResponse<Record<string, unknown>>(response.data);
  return mapFollowListResponse(data, 'follower', 'followedAt');
};

export const fetchFollowingsList = async (
  params: FollowListParams,
): Promise<FollowListResult> => {
  const response = await threadlyApi.get('/api/follows/followings', {
    params: buildFollowListParams(params),
  });
  const data = unwrapThreadlyResponse<Record<string, unknown>>(response.data);
  return mapFollowListResponse(data, 'following', 'followingAt');
};

export const followUser = async (targetUserId: string): Promise<FollowStatus> => {
  const response = await threadlyApi.post('/api/follows', { target_user_id: targetUserId });
  const data = unwrapThreadlyResponse<{ followStatus: string }>(response.data);
  return (data.followStatus ?? 'NONE') as FollowStatus;
};

export const unfollowUser = async (targetUserId: string): Promise<void> => {
  await threadlyApi.delete(`/api/follows/following/${targetUserId}`);
};

export const cancelFollowRequest = async (targetUserId: string): Promise<void> => {
  await threadlyApi.delete(`/api/follows/requests/${targetUserId}`);
};
