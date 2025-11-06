import { threadlyApi } from '@/api/http';
import { unwrapThreadlyResponse } from '@/utils/api';
import type { UserSearchResult, SearchUser } from '../types';
import type { FollowStatus } from '@/features/profile/types';

const mapSearchUser = (payload: unknown): SearchUser => {
  if (!payload || typeof payload !== 'object') {
    return { userId: '', nickname: '', followStatus: 'NONE' } as SearchUser;
  }
  const data = payload as Record<string, unknown>;
  const userRaw = (data['user'] ?? {}) as Record<string, unknown>;
  const followStatus = (data['followStatus'] ?? data['follow_status'] ?? 'NONE') as FollowStatus;
  return {
    userId: (userRaw['userId'] ?? userRaw['user_id'] ?? '').toString(),
    nickname: (userRaw['nickname'] ?? userRaw['nickName'] ?? '').toString(),
    profileImageUrl: (userRaw['profileImageUrl'] ?? userRaw['profile_image_url'] ?? undefined) as
      | string
      | undefined,
    followStatus,
  };
};

const toUserSearchResult = (payload: unknown): UserSearchResult => {
  const data = unwrapThreadlyResponse<Record<string, unknown>>(payload);
  const rawContent = (data['content'] ?? []) as unknown[];
  const users = Array.isArray(rawContent)
    ? rawContent
        .map(mapSearchUser)
        .filter((user) => Boolean(user.userId))
    : [];

  const rawNextCursor = (data['nextCursor'] ?? data['next_cursor']) as Record<string, unknown> | undefined;
  let nextCursor: UserSearchResult['nextCursor'] = null;
  if (rawNextCursor && typeof rawNextCursor === 'object') {
    nextCursor = {
      cursorId: rawNextCursor['cursorId']?.toString() ?? rawNextCursor['cursor_id']?.toString() ?? null,
      cursorTimestamp:
        rawNextCursor['cursorTimestamp']?.toString() ?? rawNextCursor['cursor_timestamp']?.toString() ?? null,
    };
  }

  return { users, nextCursor };
};

export const searchUsers = async (keyword: string): Promise<UserSearchResult> => {
  const response = await threadlyApi.get('/api/users/search', {
    params: {
      keyword,
      limit: 20,
    },
  });
  return toUserSearchResult(response.data);
};
