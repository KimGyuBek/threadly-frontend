import type { FollowStatus } from '@/features/profile/types';

export type SearchTab = 'users' | 'posts';

export interface SearchUser {
  userId: string;
  nickname: string;
  profileImageUrl?: string;
  followStatus: FollowStatus;
}

export interface UserSearchResult {
  users: SearchUser[];
  nextCursor: {
    cursorId: string | null;
    cursorTimestamp: string | null;
  } | null;
}
