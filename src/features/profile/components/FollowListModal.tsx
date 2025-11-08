import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { MouseEvent } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { fetchFollowersList, fetchFollowingsList } from '@/features/profile/api/profileApi';
import type { FollowListResult, FollowListUser } from '@/features/profile/types';
import { FollowButton } from '@/features/profile/components/FollowButton';
import { useAuthStore } from '@/store/authStore';
import { getProfileImageUrl } from '@/utils/profileImage';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

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
  const navigate = useNavigate();
  const hasAccessToken = useAuthStore((state) => Boolean(state.tokens?.accessToken));

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
    enabled: isOpen && Boolean(userId) && hasAccessToken,
    staleTime: 0,
  });

  const users: FollowListUser[] = useMemo(
    () => (listQuery.data?.pages ?? []).flatMap((page) => page.users),
    [listQuery.data],
  );

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const { fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: isInitialLoading, isError } = listQuery;

  const handleLoadMore = useCallback(() => {
    if (!isOpen) {
      return;
    }
    if (hasNextPage && !isFetchingNextPage && !isInitialLoading) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isInitialLoading, isOpen]);

  useIntersectionObserver(loadMoreRef, handleLoadMore, { rootMargin: '150px' });

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

  if (!hasAccessToken) {
    return (
      <div className="follow-list-overlay" role="dialog" aria-modal="true" onClick={onClose}>
        <div className="follow-list-modal">
          <div className="follow-list-header">
            <h3 className="follow-list-title">팔로우 정보</h3>
            <button type="button" className="follow-list-close" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="follow-list-content">
            <div className="follow-list-placeholder">팔로우 정보를 보려면 먼저 로그인하세요.</div>
          </div>
        </div>
      </div>
    );
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
                const isSelf = user.userId === userId;
                const avatarUrl = getProfileImageUrl(user.profileImageUrl);
                return (
                  <li key={user.userId} className="follow-list-item">
                    <button
                      type="button"
                      className="follow-list-main"
                      onClick={() => {
                        onClose();
                        if (isSelf) {
                          navigate('/profile');
                        } else {
                          navigate(`/users/${user.userId}`);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onClose();
                          if (isSelf) {
                            navigate('/profile');
                          } else {
                            navigate(`/users/${user.userId}`);
                          }
                        }
                      }}
                    >
                      <div className="follow-list-avatar">
                        <img src={avatarUrl} alt={user.nickname || user.userId} />
                      </div>
                      <div className="follow-list-info">
                        <span className="follow-list-name">{user.nickname || user.userId}</span>
                        <span className="follow-list-username">@{user.userId}</span>
                        {since ? <span className="follow-list-date">{since}</span> : null}
                      </div>
                    </button>
                    {!isSelf ? (
                      <FollowButton
                        userId={user.userId}
                        fetchStatus
                        invalidateKeys={[{ queryKey }, { queryKey: ['followStats', user.userId] }]}
                        className="follow-list-follow-btn"
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
          {!isInitialLoading && !isError && users.length > 0 && (
            <div ref={loadMoreRef} className="follow-list-footer">
              {isFetchingNextPage ? <span>불러오는 중...</span> : null}
              {!hasNextPage ? <span>모든 사용자를 확인했습니다.</span> : null}
            </div>
          )}
      </div>
    </div>
  );
};

export default FollowListModal;
