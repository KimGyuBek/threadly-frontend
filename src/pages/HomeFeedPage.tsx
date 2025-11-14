import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { InfiniteData } from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

import { BouncingDotsLoader } from '@/components/BouncingDotsLoader';
import { NetworkErrorFallback } from '@/components/NetworkErrorFallback';
import { fetchFeed } from '@/features/posts/api/postsApi';
import type { FeedResponse, FeedPost } from '@/features/posts/types';
import { PostCard } from '@/features/posts/components/PostCard';
import { buildErrorMessage } from '@/utils/errorMessage';
import { isThreadlyApiError } from '@/utils/threadlyError';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useMyProfileQuery } from '@/hooks/useMyProfile';
import { isNetworkUnavailableError, NETWORK_UNAVAILABLE_MESSAGE } from '@/utils/networkError';

const FEED_QUERY_KEY = ['feed'];

type Cursor = { cursorTimestamp: string; cursorId: string };

const HomeFeedPage = () => {
  const navigate = useNavigate();
  const feedQuery = useInfiniteQuery<FeedResponse, Error, InfiniteData<FeedResponse, Cursor | undefined>, typeof FEED_QUERY_KEY, Cursor | undefined>({
    queryKey: FEED_QUERY_KEY,
    queryFn: ({ pageParam }) => fetchFeed(pageParam),
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
    retry: (failureCount, error) => {
      if (isNetworkUnavailableError(error)) {
        toast.error(NETWORK_UNAVAILABLE_MESSAGE);
        return false;
      }
      const message = buildErrorMessage(error, '피드를 불러오지 못했습니다.');
      if (failureCount === 1) {
        toast.error(message);
      }
      return failureCount < 3;
    },
  });

  const posts = useMemo<FeedPost[]>(() => {
    if (!feedQuery.data) {
      return [];
    }
    const seen = new Set<string>();
    const uniquePosts: FeedPost[] = [];
    feedQuery.data.pages.forEach((page) => {
      page.content?.forEach((post) => {
        const key = post.postId;
        if (!seen.has(key)) {
          seen.add(key);
          uniquePosts.push(post);
        }
      });
    });
    return uniquePosts;
  }, [feedQuery.data]);

  const myProfileQuery = useMyProfileQuery();
  const viewerUserId = myProfileQuery.data?.userId;

  useEffect(() => {
    if (feedQuery.isError) {
      const error = feedQuery.error;
      if (isThreadlyApiError(error) && error.code === 'USER_PROFILE_NOT_SET') {
        navigate('/profile/setup', { replace: true });
      }
    }
  }, [feedQuery.isError, feedQuery.error, navigate]);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const { fetchNextPage, refetch } = feedQuery;

  const handleLoadMore = useCallback(() => {
    if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage && !feedQuery.isLoading) {
      fetchNextPage();
    }
  }, [feedQuery.hasNextPage, feedQuery.isFetchingNextPage, feedQuery.isLoading, fetchNextPage]);

  useIntersectionObserver(loadMoreRef, handleLoadMore, { rootMargin: '200px' });

  usePullToRefresh(() => {
    refetch({ throwOnError: false });
  });

  const errorMessage = feedQuery.isError
    ? buildErrorMessage(feedQuery.error, '피드를 불러오지 못했습니다.')
    : null;
  const showFeedFooter = !feedQuery.isLoading && !feedQuery.isError && posts.length > 0;

  return (
    <div className="feed-container">
      <h2 className="section-title">피드</h2>
      {feedQuery.isLoading ? (
        <div className="feed-placeholder">
          <BouncingDotsLoader message="피드를 불러오는 중입니다..." />
        </div>
      ) : feedQuery.isError ? (
        isNetworkUnavailableError(feedQuery.error) ? (
          <NetworkErrorFallback />
        ) : (
          <div className="feed-placeholder feed-placeholder--error">
            <p>{errorMessage}</p>
            <button type="button" className="btn" onClick={() => feedQuery.refetch()}>
              다시 시도
            </button>
          </div>
        )
      ) : posts.length === 0 ? (
        <div className="feed-placeholder">표시할 게시글이 없습니다.</div>
      ) : (
        <div className="feed-list">
          {posts.map((post) => (
            <PostCard
              key={post.postId}
              post={post}
              viewerUserId={viewerUserId}
              invalidateKeys={[{ queryKey: FEED_QUERY_KEY }]}
            />
          ))}
        </div>
      )}
      {showFeedFooter ? (
        <div ref={loadMoreRef} className="feed-footer">
          {feedQuery.isFetchingNextPage ? (
            <span className="feed-loading">
              <BouncingDotsLoader size="sm" message="불러오는 중..." />
            </span>
          ) : null}
          {!feedQuery.hasNextPage ? <span className="feed-end">모든 게시글을 확인했습니다.</span> : null}
        </div>
      ) : null}
    </div>
  );
};

export default HomeFeedPage;
