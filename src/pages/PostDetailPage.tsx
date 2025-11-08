import { useEffect, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { isAxiosError } from 'axios';

import {
  fetchPostDetail,
  fetchPostComments,
  likeComment,
  unlikeComment,
  createPostComment,
  type CommentLikeResponse,
} from '@/features/posts/api/postsApi';
import type { FeedPost, PostComment, PostCommentsPage } from '@/features/posts/types';
import { PostCard } from '@/features/posts/components/PostCard';
import { buildErrorMessage } from '@/utils/errorMessage';
import { formatRelativeTime } from '@/utils/date';
import { isThreadlyApiError } from '@/utils/threadlyError';
import { useMyProfileQuery } from '@/hooks/useMyProfile';
import { Heart } from 'lucide-react';
import { getProfileImageUrl } from '@/utils/profileImage';

const COMMENTS_PAGE_SIZE = 10;

const PostDetailPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [commentContent, setCommentContent] = useState('');

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
  const trimmedCommentContent = commentContent.trim();
  const canSubmitComment = Boolean(postId) && trimmedCommentContent.length > 0;

  const appendCommentToCache = (newComment: PostComment) => {
    if (!postId) {
      return;
    }
    queryClient.setQueryData<InfiniteData<PostCommentsPage> | undefined>(
      ['post', postId, 'comments'],
      (previous) => {
        if (!previous || previous.pages.length === 0) {
          return previous;
        }
        const [firstPage, ...restPages] = previous.pages;
        const updatedFirstPage = {
          ...firstPage,
          comments: [newComment, ...firstPage.comments].slice(0, COMMENTS_PAGE_SIZE),
        };
        return {
          ...previous,
          pages: [updatedFirstPage, ...restPages],
        };
      },
    );
  };

  const createCommentMutation = useMutation<PostComment, unknown, string>({
    mutationFn: async (content) => {
      if (!postId) {
        throw new Error('postId is required for creating a comment');
      }
      return createPostComment(postId, content);
    },
    onSuccess: (newComment) => {
      setCommentContent('');
      toast.success('댓글을 등록했습니다.');
      if (postId) {
        queryClient.setQueryData<FeedPost | undefined>(['post', postId], (previous) =>
          previous
            ? {
                ...previous,
                commentCount: previous.commentCount + 1,
              }
            : previous,
        );
        appendCommentToCache(newComment);
        void queryClient.invalidateQueries({ queryKey: ['post', postId, 'comments'] });
      }
    },
    onError: (error) => {
      toast.error(buildErrorMessage(error, '댓글을 등록하지 못했습니다.'));
    },
  });

  const handleCommentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmitComment || createCommentMutation.isPending) {
      return;
    }
    createCommentMutation.mutate(trimmedCommentContent);
  };

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
          invalidateKeys={postId ? [{ queryKey: ['post', postId] }] : []}
        />
      </div>

      <section className="post-comment-form">
        <form onSubmit={handleCommentSubmit}>
          <label htmlFor="commentContent" className="sr-only">
            댓글 내용
          </label>
          <textarea
            id="commentContent"
            name="commentContent"
            value={commentContent}
            onChange={(event) => setCommentContent(event.target.value)}
            placeholder="더 나누고 싶은 생각을 적어보세요"
            aria-label="댓글 내용"
            maxLength={255}
            rows={3}
            disabled={!postId || createCommentMutation.isPending}
          />
          <div className="post-comment-form__footer">
            <span className="post-comment-form__counter">{commentContent.length}/255</span>
            <button
              type="submit"
              className="btn"
              disabled={!canSubmitComment || createCommentMutation.isPending}
            >
              {createCommentMutation.isPending ? '작성 중...' : '댓글 작성'}
            </button>
          </div>
        </form>
      </section>

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
                <PostCommentItem
                  key={comment.commentId}
                  comment={comment}
                  postId={postId ?? undefined}
                />
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

const PostCommentItem = ({ comment, postId }: { comment: PostComment; postId?: string }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(comment.liked);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const commenterAvatarUrl = getProfileImageUrl(comment.commenter.profileImageUrl);

  useEffect(() => {
    setLiked(comment.liked);
    setLikeCount(comment.likeCount);
  }, [comment.commentId, comment.liked, comment.likeCount]);

  const updateCachedComment = (nextLiked: boolean, nextCount: number) => {
    if (!postId) {
      return;
    }
    queryClient.setQueryData<InfiniteData<PostCommentsPage> | undefined>(
      ['post', postId, 'comments'],
      (previous) => {
        if (!previous) {
          return previous;
        }
        const pages = previous.pages.map((page) => ({
          ...page,
          comments: page.comments.map((item) =>
            item.commentId === comment.commentId
              ? { ...item, likeCount: nextCount, liked: nextLiked }
              : item,
          ),
        }));
        return { ...previous, pages };
      },
    );
  };

  const toggleLikeMutation = useMutation<CommentLikeResponse, unknown, boolean, { previousLiked: boolean; previousLikeCount: number }>({
    mutationFn: async (nextLiked) => {
      if (!postId) {
        throw new Error('postId is required for comment like');
      }
      return nextLiked ? likeComment(postId, comment.commentId) : unlikeComment(postId, comment.commentId);
    },
    onMutate: () => ({ previousLiked: liked, previousLikeCount: likeCount }),
    onSuccess: (response, nextLiked) => {
      setLikeCount(response.likeCount);
      setLiked(nextLiked);
      updateCachedComment(nextLiked, response.likeCount);
    },
    onError: (error, _vars, context) => {
      if (context) {
        setLiked(context.previousLiked);
        setLikeCount(context.previousLikeCount);
      }
      toast.error(buildErrorMessage(error, '댓글 좋아요 처리에 실패했습니다.'));
    },
  });

  const handleNavigate = () => {
    if (!comment.commenter.userId) {
      return;
    }
    navigate(`/users/${comment.commenter.userId}`);
  };

  const handleToggleLike = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!postId || toggleLikeMutation.isPending) {
      return;
    }
    toggleLikeMutation.mutate(!liked);
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
        <img src={commenterAvatarUrl} alt={comment.commenter.nickname} loading="lazy" />
      </div>
      <div className="post-comment__body">
        <div className="post-comment__meta">
          <span className="post-comment__name">{comment.commenter.nickname}</span>
          <span className="post-comment__username">@{comment.commenter.userId}</span>
          <span className="post-comment__time">{formatRelativeTime(comment.commentedAt)}</span>
        </div>
        <p className="post-comment__content">{comment.content}</p>
        <div className="post-comment__actions" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className={`post-comment__like-button ${liked ? 'post-comment__like-button--active' : ''}`}
            onClick={handleToggleLike}
            disabled={toggleLikeMutation.isPending || !postId}
          >
            <Heart size={14} />
            <span>{likeCount.toLocaleString()}</span>
          </button>
          {liked ? <span className="post-comment__liked">내가 좋아요</span> : null}
        </div>
      </div>
    </li>
  );
};
