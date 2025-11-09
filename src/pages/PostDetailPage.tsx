import { useCallback, useEffect, useRef, useState } from 'react';
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
  updatePostComment,
  deletePostComment,
  type CommentLikeResponse,
} from '@/features/posts/api/postsApi';
import type { FeedPost, PostComment, PostCommentsPage } from '@/features/posts/types';
import { PostCard } from '@/features/posts/components/PostCard';
import { buildErrorMessage } from '@/utils/errorMessage';
import { formatRelativeTime } from '@/utils/date';
import { isThreadlyApiError } from '@/utils/threadlyError';
import { useMyProfileQuery } from '@/hooks/useMyProfile';
import { EllipsisVertical, Heart } from 'lucide-react';
import { getProfileImageUrl } from '@/utils/profileImage';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

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

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const { fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = commentsQuery;

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isLoading) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isLoading]);

  useIntersectionObserver(loadMoreRef, handleLoadMore, { rootMargin: '200px' });

  const handlePostDeleted = useCallback(() => {
    if (postId) {
      queryClient.removeQueries({ queryKey: ['post', postId] });
      queryClient.removeQueries({ queryKey: ['post', postId, 'comments'] });
    }
    navigate('/', { replace: true });
  }, [navigate, postId, queryClient]);

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
          onDeleteSuccess={handlePostDeleted}
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
                  viewerUserId={viewerUserId}
                />
              ))}
            </ul>
          ) : null}
          {!commentsQuery.isLoading && !hasUnauthorizedComments && (comments.length > 0 || hasNextPage) ? (
            <div ref={loadMoreRef} className="post-comments__sentinel">
              {isFetchingNextPage ? <span>불러오는 중...</span> : null}
              {!hasNextPage && comments.length > 0 ? <span>모든 댓글을 확인했습니다.</span> : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
};

export default PostDetailPage;

interface PostCommentItemProps {
  comment: PostComment;
  postId?: string;
  viewerUserId?: string;
}

const PostCommentItem = ({ comment, postId, viewerUserId }: PostCommentItemProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(comment.liked);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [currentContent, setCurrentContent] = useState(comment.content);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const commenterAvatarUrl = getProfileImageUrl(comment.commenter.profileImageUrl);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const canManageComment = Boolean(viewerUserId && viewerUserId === comment.commenter.userId);

  useEffect(() => {
    setLiked(comment.liked);
    setLikeCount(comment.likeCount);
    if (!isEditing) {
      setCurrentContent(comment.content);
      setEditedContent(comment.content);
    }
  }, [comment.commentId, comment.liked, comment.likeCount, comment.content, isEditing]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (menuRef.current?.contains(target) || moreButtonRef.current?.contains(target)) {
        return;
      }
      setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!canManageComment) {
      setIsMenuOpen(false);
      setIsEditing(false);
      setEditedContent(comment.content);
    }
  }, [canManageComment, comment.content]);

  const updateCommentInCache = (updater: (current: PostComment) => PostComment) => {
    if (!postId) {
      return;
    }
    queryClient.setQueryData<InfiniteData<PostCommentsPage> | undefined>(
      ['post', postId, 'comments'],
      (previous) => {
        if (!previous) {
          return previous;
        }
        let updated = false;
        const pages = previous.pages.map((page) => ({
          ...page,
          comments: page.comments.map((item) => {
            if (item.commentId === comment.commentId) {
              updated = true;
              return updater(item);
            }
            return item;
          }),
        }));
        return updated ? { ...previous, pages } : previous;
      },
    );
  };

  const removeCommentFromCache = () => {
    if (!postId) {
      return;
    }
    queryClient.setQueryData<InfiniteData<PostCommentsPage> | undefined>(
      ['post', postId, 'comments'],
      (previous) => {
        if (!previous) {
          return previous;
        }
        let removed = false;
        const pages = previous.pages.map((page) => ({
          ...page,
          comments: page.comments.filter((item) => {
            if (item.commentId === comment.commentId) {
              removed = true;
              return false;
            }
            return true;
          }),
        }));
        return removed ? { ...previous, pages } : previous;
      },
    );
  };

  const adjustPostCommentCount = (delta: number) => {
    if (!postId) {
      return;
    }
    queryClient.setQueryData<FeedPost | undefined>(
      ['post', postId],
      (previous) =>
        previous
          ? {
              ...previous,
              commentCount: Math.max(previous.commentCount + delta, 0),
            }
          : previous,
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
      updateCommentInCache((current) => ({ ...current, likeCount: response.likeCount, liked: nextLiked }));
    },
    onError: (error, _vars, context) => {
      if (context) {
        setLiked(context.previousLiked);
        setLikeCount(context.previousLikeCount);
      }
      toast.error(buildErrorMessage(error, '댓글 좋아요 처리에 실패했습니다.'));
    },
  });

  const updateCommentMutation = useMutation<PostComment, unknown, string>({
    mutationFn: async (content) => {
      if (!postId) {
        throw new Error('postId is required for updating comment');
      }
      return updatePostComment(postId, comment.commentId, content);
    },
    onSuccess: (updated) => {
      setIsEditing(false);
      setCurrentContent(updated.content);
      setEditedContent(updated.content);
      updateCommentInCache(() => updated);
      toast.success('댓글을 수정했습니다.');
    },
    onError: (error) => {
      toast.error(buildErrorMessage(error, '댓글을 수정하지 못했습니다.'));
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async () => {
      if (!postId) {
        throw new Error('postId is required for deleting comment');
      }
      return deletePostComment(postId, comment.commentId);
    },
    onSuccess: () => {
      removeCommentFromCache();
      adjustPostCommentCount(-1);
      toast.success('댓글을 삭제했습니다.');
    },
    onError: (error) => {
      toast.error(buildErrorMessage(error, '댓글을 삭제하지 못했습니다.'));
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

  const handleToggleMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!canManageComment) {
      return;
    }
    setIsMenuOpen((prev) => !prev);
  };

  const handleEditSelection = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!canManageComment) {
      return;
    }
    setIsMenuOpen(false);
    setEditedContent(currentContent);
    setIsEditing(true);
  };

  const handleDeleteSelection = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!canManageComment || deleteCommentMutation.isPending || updateCommentMutation.isPending) {
      return;
    }
    setIsMenuOpen(false);
    if (!window.confirm('댓글을 삭제하시겠습니까?')) {
      return;
    }
    deleteCommentMutation.mutate();
  };

  const handleCancelEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (updateCommentMutation.isPending) {
      return;
    }
    setEditedContent(currentContent);
    setIsEditing(false);
  };

  const handleSaveEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!canManageComment || updateCommentMutation.isPending) {
      return;
    }
    const trimmed = editedContent.trim();
    if (!trimmed) {
      toast.error('댓글 내용을 입력하세요.');
      return;
    }
    if (trimmed === currentContent.trim()) {
      setIsEditing(false);
      return;
    }
    updateCommentMutation.mutate(trimmed);
  };

  const isInteractive = !isEditing;
  const containerClickProps = isInteractive
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick: handleNavigate,
        onKeyDown: (event: React.KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleNavigate();
          }
        },
      }
    : { role: undefined, tabIndex: -1 };

  return (
    <li
      className="post-comment"
      {...containerClickProps}
    >
      <div className="post-comment__avatar">
        <img src={commenterAvatarUrl} alt={comment.commenter.nickname} loading="lazy" />
      </div>
      <div className="post-comment__body">
        <div className="post-comment__header">
          <div className="post-comment__meta">
            <span className="post-comment__name">{comment.commenter.nickname}</span>
            <span className="post-comment__username">@{comment.commenter.userId}</span>
            <span className="post-comment__time">{formatRelativeTime(comment.commentedAt)}</span>
          </div>
          {canManageComment ? (
            <div className="post-comment__menu-wrapper" ref={menuRef} onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="post-comment__more-button"
                onClick={handleToggleMenu}
                ref={moreButtonRef}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                aria-label="댓글 관리 메뉴"
              >
                <EllipsisVertical size={16} />
              </button>
              {isMenuOpen ? (
                <div className="post-comment__menu" role="menu">
                  <button type="button" role="menuitem" onClick={handleEditSelection}>
                    수정
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="post-comment__menu-item--danger"
                    onClick={handleDeleteSelection}
                  >
                    삭제
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        {isEditing ? (
          <div className="post-comment__editor" onClick={(event) => event.stopPropagation()}>
            <textarea
              value={editedContent}
              onChange={(event) => setEditedContent(event.target.value)}
              className="post-comment__editor-textarea"
              rows={3}
              maxLength={255}
              disabled={updateCommentMutation.isPending}
            />
            <div className="post-comment__editor-actions">
              <button
                type="button"
                className="post-comment__editor-btn"
                onClick={handleCancelEdit}
                disabled={updateCommentMutation.isPending}
              >
                취소
              </button>
              <button
                type="button"
                className="post-comment__editor-btn post-comment__editor-btn--primary"
                onClick={handleSaveEdit}
                disabled={updateCommentMutation.isPending}
              >
                {updateCommentMutation.isPending ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        ) : (
          <p className="post-comment__content">{currentContent}</p>
        )}
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
