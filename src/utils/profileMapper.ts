import type { FollowStatus, MyProfile, UserProfile } from '@/features/profile/types';
import { unwrapThreadlyResponse } from './api';
import { normalizeProfileImageUrl } from './profileImage';

export const toProfile = (payload: unknown): UserProfile => {
  const data = unwrapThreadlyResponse<Record<string, unknown>>(payload);
  const user = (data['user'] as Record<string, unknown> | undefined) ?? data;
  return {
    user: {
      userId: (user['userId'] ?? user['user_id'] ?? '').toString(),
      nickname: (user['nickname'] ?? '').toString(),
      profileImageUrl: normalizeProfileImageUrl(
        (user['profileImageUrl'] ?? user['profile_image_url'] ?? undefined) as string | undefined,
      ),
    },
    statusMessage: (data['statusMessage'] ?? data['status_message'] ?? '') as string,
    bio: (data['bio'] ?? '') as string,
    followStatus: (data['followStatus'] ?? data['follow_status'] ?? 'NONE').toString() as FollowStatus,
    followerCount: Number(data['followerCount'] ?? data['follower_count'] ?? 0),
    followingCount: Number(data['followingCount'] ?? data['following_count'] ?? 0),
  };
};

export const toMyProfile = (payload: unknown): MyProfile => {
  const data = unwrapThreadlyResponse<Record<string, unknown>>(payload);
  return {
    userId: (data['userId'] ?? data['user_id'] ?? '').toString(),
    nickname: (data['nickname'] ?? data['nickName'] ?? '').toString(),
    statusMessage: (data['statusMessage'] ?? data['status_message'] ?? '') as string,
    bio: (data['bio'] ?? '') as string,
    phone: (data['phone'] ?? '') as string,
    genderType: (data['genderType'] ?? data['gender_type'] ?? data['gender'] ?? '') as string,
    profileImageUrl: normalizeProfileImageUrl(
      (data['profileImageUrl'] ?? data['profile_image_url'] ?? undefined) as string | undefined,
    ),
    isPrivate: Boolean(data['isPrivate'] ?? data['is_private'] ?? false),
    followerCount: Number(data['followerCount'] ?? data['follower_count'] ?? 0),
    followingCount: Number(data['followingCount'] ?? data['following_count'] ?? 0),
  };
};
