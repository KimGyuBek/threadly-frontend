import { threadlyApi } from '@/api/http';
import type { FollowStatus, MyProfile, UserProfile } from '../types';
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
  const accessToken = (data as AuthTokens).accessToken ?? (data as any)?.access_token;
  const refreshToken = (data as AuthTokens).refreshToken ?? (data as any)?.refresh_token;
  if (!accessToken || !refreshToken) {
    throw new Error('프로필 설정 토큰 응답이 올바르지 않습니다.');
  }
  return { accessToken, refreshToken };
};

export const fetchUserProfile = async (userId: string): Promise<UserProfile> => {
  const response = await threadlyApi.get(`/api/users/profile/${userId}`);
  return toProfile(response.data);
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
