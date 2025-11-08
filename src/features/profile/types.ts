export interface UserPreview {
  userId: string;
  nickname: string;
  profileImageUrl?: string;
}

export type FollowStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SELF';

export interface FollowStats {
  followerCount: number;
  followingCount: number;
}

export interface FollowListParams {
  userId: string;
  cursorTimestamp?: string | null;
  cursorId?: string | null;
  limit?: number;
}

export interface FollowListUser {
  userId: string;
  nickname: string;
  profileImageUrl?: string;
  since?: string | null;
}

export interface FollowListResult {
  users: FollowListUser[];
  nextCursor: { cursorTimestamp: string | null; cursorId: string | null } | null;
}

export interface UserProfile {
  user: UserPreview;
  statusMessage?: string;
  bio?: string;
  followStatus: FollowStatus;
  followerCount?: number;
  followingCount?: number;
}

export interface MyProfile {
  userId: string;
  nickname: string;
  statusMessage?: string;
  bio?: string;
  phone?: string;
  genderType?: string;
  profileImageUrl?: string;
  profileImageId?: string | null;
  isPrivate?: boolean;
  followerCount?: number;
  followingCount?: number;
}
