import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { isAxiosError } from 'axios';

import { fetchPostDetail, fetchPostComments } from '@/features/posts/api/postsApi';
import type { PostComment } from '@/features/posts/types';
import { PostCard } from '@/features/posts/components/PostCard';
import { buildErrorMessage } from '@/utils/errorMessage';
import { formatRelativeTime } from '@/utils/date';
import { isThreadlyApiError } from '@/utils/threadlyError';
import { useMyProfileQuery } from '@/hooks/useMyProfile';

const COMMENTS_PAGE_SIZE = 10;

const PostDetailPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();

  const detailQuery = useQuery({
    queryKey: ['post', postId],
    queryFn: () => fetchPostDetail(postId ?? ''),
    enabled: Boolean(postId),
    retry: (count, error) => {
      const message = buildErrorMessage(error, '게시글을 불러오지 못했습니다.');
      if (count === 1) {
        toast.error(message);
      }
      return count < 2;
    },
  });

  const commentCount = detailQuery.data?.commentCount ?? 0;

  const myProfileQuery = useMyProfileQuery();
  const viewerUserId = myProfileQuery.data?.userId;

  const commentsQuery = useInfiniteQuery({
    queryKey: ['post', postId, 'comments'],
    enabled: Boolean(postId) && commentCount > 0,
    retry: false,
    initialPageParam: { cursorTimestamp: null as string | null, cursorId: null as string | null },
    queryFn: async ({ pageParam }) => {
      if (!postId) {
        return { comments: [], nextCursor: null };
      }
      try {
        return await fetchPostComments(postId, {
          cursorTimestamp: pageParam?.cursorTimestamp ?? undefined,
          cursorId: pageParam?.cursorId ?? undefined,
          limit: COMMENTS_PAGE_SIZE,
        });
      } catch (error) {
        if (
          isThreadlyApiError(error) &&
          (error.status === 401 || error.status === 403 || error.code === 'TLY2006')
        ) {
          return { comments: [], nextCursor: null, unauthorized: true };
        }
        if (isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
          return { comments: [], nextCursor: null, unauthorized: true };
        }
        throw error;
      }
    },
    getNextPageParam: (lastPage) => {
      const cursor = lastPage.nextCursor;
      if (!cursor?.cursorTimestamp || !cursor?.cursorId) {
        return undefined;
      }
      return {
        cursorTimestamp: cursor.cursorTimestamp,
        cursorId: cursor.cursorId,
      };
    },
  });

  const commentPages = commentsQuery.data?.pages ?? [];
  const comments = commentPages.flatMap((page) => page.comments);
  const hasUnauthorizedComments = commentPages.some((page) => page.unauthorized);

  if (detailQuery.isLoading) {
    return <div className="feed-placeholder">게시글을 불러오는 중입니다...</div>;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="feed-placeholder feed-placeholder--error">
        <p>게시글을 불러오지 못했습니다.</p>
        <button type="button" className="btn" onClick={() => navigate(-1)}>
          뒤로가기
        </button>
      </div>
    );
  }

  return (
    <div className="feed-container">
      <button type="button" className="btn btn--secondary" onClick={() => navigate(-1)}>
        뒤로가기
      </button>
      <div className="feed-list">
        <PostCard
          post={detailQuery.data}
          disableNavigation
          allowAuthorNavigation
          viewerUserId={viewerUserId}
        />
      </div>

      {commentCount > 0 ? (
        <section className="post-comments">
          <h3>댓글 {commentCount.toLocaleString()}</h3>
          {commentsQuery.isLoading ? (
            <div className="post-comments__placeholder">댓글을 불러오는 중입니다...</div>
          ) : null}
          {commentsQuery.isError && !commentsQuery.isLoading ? (
            <div className="post-comments__placeholder">
              <p>댓글을 불러오지 못했습니다.</p>
              <button type="button" className="btn btn--secondary" onClick={() => commentsQuery.refetch()}>
                다시 시도
              </button>
            </div>
          ) : null}
          {hasUnauthorizedComments && !commentsQuery.isLoading ? (
            <div className="post-comments__placeholder">댓글을 보려면 로그인하세요.</div>
          ) : null}
          {!commentsQuery.isLoading && !hasUnauthorizedComments && comments.length === 0 ? (
            <div className="post-comments__placeholder">댓글이 없습니다.</div>
          ) : null}
          {comments.length > 0 ? (
            <ul className="post-comments__list">
              {comments.map((comment) => (
                <PostCommentItem key={comment.commentId} comment={comment} />
              ))}
            </ul>
          ) : null}
          {commentsQuery.hasNextPage && !commentsQuery.isLoading ? (
            <div className="post-comments__footer">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => commentsQuery.fetchNextPage()}
                disabled={commentsQuery.isFetchingNextPage}
              >
                {commentsQuery.isFetchingNextPage ? '불러오는 중...' : '더 보기'}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
};

export default PostDetailPage;

const PostCommentItem = ({ comment }: { comment: PostComment }) => {
  const navigate = useNavigate();
  const handleNavigate = () => {
    if (!comment.commenter.userId) {
      return;
    }
    navigate(`/users/${comment.commenter.userId}`);
  };

  return (
    <li
      className="post-comment"
      role="button"
      tabIndex={0}
      onClick={handleNavigate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleNavigate();
        }
      }}
    >
      <div className="post-comment__avatar">
        {comment.commenter.profileImageUrl ? (
          <img src={comment.commenter.profileImageUrl} alt={comment.commenter.nickname} loading="lazy" />
        ) : (
          <span>{comment.commenter.nickname?.charAt(0) ?? '?'}</span>
        )}
      </div>
      <div className="post-comment__body">
        <div className="post-comment__meta">
          <span className="post-comment__name">{comment.commenter.nickname}</span>
          <span className="post-comment__username">@{comment.commenter.userId}</span>
          <span className="post-comment__time">{formatRelativeTime(comment.commentedAt)}</span>
        </div>
        <p className="post-comment__content">{comment.content}</p>
        <div className="post-comment__actions">
          <span className="post-comment__likes">좋아요 {comment.likeCount.toLocaleString()}</span>
          {comment.liked ? <span className="post-comment__liked">• 내가 좋아요</span> : null}
        </div>
      </div>
    </li>
  );
};
