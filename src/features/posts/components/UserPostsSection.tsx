import { useCallback, useMemo, useRef } from 'react';
import type { InfiniteData } from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';

import { fetchUserPosts } from '@/features/posts/api/postsApi';
import type { FeedPost, FeedResponse } from '@/features/posts/types';
import { PostCard } from '@/features/posts/components/PostCard';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { buildErrorMessage } from '@/utils/errorMessage';
import { isThreadlyApiError } from '@/utils/threadlyError';

interface UserPostsSectionProps {
  userId?: string;
  viewerUserId?: string;
  title?: string;
  emptyMessage?: string;
  pageSize?: number;
}

type Cursor = { cursorTimestamp: string; cursorId: string };

export const UserPostsSection = ({
  userId,
  viewerUserId,
  title = '게시글',
  emptyMessage = '아직 게시글이 없습니다.',
  pageSize = 10,
}: UserPostsSectionProps) => {
  const hasUserId = Boolean(userId);
  const effectiveUserId = userId ?? '';
  const queryKey = ['user-posts', effectiveUserId] as const;

  const userPostsQuery = useInfiniteQuery<
    FeedResponse,
    Error,
    InfiniteData<FeedResponse, Cursor | undefined>,
    typeof queryKey,
    Cursor | undefined
  >({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchUserPosts(effectiveUserId, {
        cursorTimestamp: pageParam?.cursorTimestamp,
        cursorId: pageParam?.cursorId,
        limit: pageSize,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNext && lastPage.nextCursor) {
        return {
          cursorTimestamp: lastPage.nextCursor.timestamp,
          cursorId: lastPage.nextCursor.id,
        } satisfies Cursor;
      }
      return undefined;
    },
    enabled: hasUserId,
    retry: 1,
  });

  const posts = useMemo<FeedPost[]>(() => {
    if (!userPostsQuery.data) {
      return [];
    }
    const seen = new Set<string>();
    const uniquePosts: FeedPost[] = [];
    userPostsQuery.data.pages.forEach((page) => {
      page.content?.forEach((post) => {
        const key = post.postId;
        if (!seen.has(key)) {
          seen.add(key);
          uniquePosts.push(post);
        }
      });
    });
    return uniquePosts;
  }, [userPostsQuery.data]);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const { fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = userPostsQuery;

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isLoading) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isLoading]);

  useIntersectionObserver(loadMoreRef, handleLoadMore, { rootMargin: '200px' });

  const errorMessage = userPostsQuery.isError
    ? buildErrorMessage(userPostsQuery.error, '게시글을 불러오지 못했습니다.')
    : null;

  const forbiddenErrorMessage =
    userPostsQuery.isError &&
    isThreadlyApiError(userPostsQuery.error) &&
    userPostsQuery.error.status === 403
      ? '이 사용자의 게시글은 비공개입니다.'
      : null;

  if (!hasUserId) {
    return null;
  }

  return (
    <div className="profile-section" data-testid="user-posts-section">
      <h3>{title}</h3>
      {userPostsQuery.isLoading ? (
        <div className="feed-placeholder">게시글을 불러오는 중입니다...</div>
      ) : forbiddenErrorMessage ? (
        <div className="feed-placeholder feed-placeholder--error">{forbiddenErrorMessage}</div>
      ) : userPostsQuery.isError ? (
        <div className="feed-placeholder feed-placeholder--error">
          <p>{errorMessage}</p>
          <button type="button" className="btn" onClick={() => userPostsQuery.refetch()}>
            다시 시도
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="feed-placeholder">{emptyMessage}</div>
      ) : (
        <div className="feed-list">
          {posts.map((post) => (
            <PostCard
              key={post.postId}
              post={post}
              viewerUserId={viewerUserId}
              invalidateKeys={[{ queryKey }, { queryKey: ['feed'] }]}
              allowAuthorNavigation
            />
          ))}
        </div>
      )}
      <div ref={loadMoreRef} className="feed-footer">
        {userPostsQuery.isFetchingNextPage ? (
          <span className="feed-loading">불러오는 중...</span>
        ) : null}
        {!userPostsQuery.hasNextPage && posts.length > 0 ? (
          <span className="feed-end">모든 게시글을 확인했습니다.</span>
        ) : null}
      </div>
    </div>
  );
};
