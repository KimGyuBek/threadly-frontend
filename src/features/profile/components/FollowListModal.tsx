import { useEffect, useMemo } from 'react';
import type { MouseEvent } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

import {
  fetchFollowersList,
  fetchFollowingsList,
  type FollowListResult,
  type FollowListUser,
} from '@/features/profile/api/profileApi';

export type FollowListType = 'followers' | 'followings';

interface FollowListModalProps {
  userId: string;
  type: FollowListType;
  isOpen: boolean;
  onClose: () => void;
}

const FOLLOW_LIST_LIMIT = 20;

type CursorParam = { cursorTimestamp?: string | null; cursorId?: string | null };

const getNextPageParam = (result: FollowListResult | undefined): CursorParam | undefined => {
  if (!result?.nextCursor) {
    return undefined;
  }
  const { cursorTimestamp, cursorId } = result.nextCursor;
  if (!cursorTimestamp || !cursorId) {
    return undefined;
  }
  return { cursorTimestamp, cursorId };
};

const formatSince = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const FollowListModal = ({ userId, type, isOpen, onClose }: FollowListModalProps) => {
  const queryKey = useMemo(() => ['follow-list', type, userId], [type, userId]);

  const listQuery = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }: { pageParam?: CursorParam }) => {
      const cursorTimestamp = pageParam?.cursorTimestamp ?? null;
      const cursorId = pageParam?.cursorId ?? null;
      if (type === 'followers') {
        return fetchFollowersList({
          userId,
          cursorTimestamp,
          cursorId,
          limit: FOLLOW_LIST_LIMIT,
        });
      }
      return fetchFollowingsList({
        userId,
        cursorTimestamp,
        cursorId,
        limit: FOLLOW_LIST_LIMIT,
      });
    },
    initialPageParam: { cursorTimestamp: null, cursorId: null },
    getNextPageParam,
    enabled: isOpen && Boolean(userId),
    staleTime: 0,
  });

  const users: FollowListUser[] = useMemo(
    () => (listQuery.data?.pages ?? []).flatMap((page) => page.users),
    [listQuery.data],
  );

  const hasNextPage = Boolean(listQuery.hasNextPage);
  const isInitialLoading = listQuery.isLoading;
  const isError = listQuery.isError;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const title = type === 'followers' ? '팔로워' : '팔로잉';

  return (
    <div className="follow-list-overlay" role="dialog" aria-modal="true" onClick={handleOverlayClick}>
      <div className="follow-list-modal">
        <div className="follow-list-header">
          <h3 className="follow-list-title">{title}</h3>
          <button type="button" className="follow-list-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="follow-list-content">
          {isInitialLoading && <div className="follow-list-placeholder">목록을 불러오는 중입니다...</div>}
          {isError && (
            <div className="follow-list-placeholder">
              <p>목록을 불러오지 못했습니다.</p>
              <button type="button" className="btn btn--secondary" onClick={() => listQuery.refetch()}>
                다시 시도
              </button>
            </div>
          )}
          {!isInitialLoading && !isError && users.length === 0 && (
            <div className="follow-list-empty">표시할 사용자가 없습니다.</div>
          )}
          {!isInitialLoading && !isError && users.length > 0 && (
            <ul className="follow-list-items">
              {users.map((user) => {
                const since = formatSince(user.since);
                return (
                  <li key={user.userId} className="follow-list-item">
                    <div className="follow-list-avatar">
                      {user.profileImageUrl ? (
                        <img src={user.profileImageUrl} alt={user.nickname || user.userId} />
                      ) : (
                        <span>{user.nickname?.charAt(0) ?? user.userId.charAt(0)}</span>
                      )}
                    </div>
                    <div className="follow-list-info">
                      <span className="follow-list-name">{user.nickname || user.userId}</span>
                      <span className="follow-list-username">@{user.userId}</span>
                      {since ? <span className="follow-list-date">{since}</span> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {!isInitialLoading && !isError && hasNextPage && (
          <div className="follow-list-footer">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => listQuery.fetchNextPage()}
              disabled={listQuery.isFetchingNextPage}
            >
              {listQuery.isFetchingNextPage ? '불러오는 중...' : '더 보기'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowListModal;
