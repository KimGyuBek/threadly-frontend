export interface UserPreview {
  userId: string;
  nickname: string;
  profileImageUrl?: string;
}

export type FollowStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SELF';

export interface UserProfile {
  user: UserPreview;
  statusMessage?: string;
  bio?: string;
  followStatus: FollowStatus;
}

export interface MyProfile {
  userId: string;
  nickname: string;
  statusMessage?: string;
  bio?: string;
  phone?: string;
  genderType?: string;
  profileImageUrl?: string;
  isPrivate?: boolean;
  followerCount?: number;
  followingCount?: number;
}
