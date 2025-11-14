import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { Heart, MessageSquare, Eye, ChevronLeft, ChevronRight, EllipsisVertical } from 'lucide-react';
import { toast } from 'react-toastify';

import type { FeedPost } from '../types';
import { BouncingDotsLoader } from '@/components/BouncingDotsLoader';
import { formatRelativeTime } from '@/utils/date';
import {
  deletePost,
  fetchPostEngagement,
  fetchPostComments,
  likePost,
  unlikePost,
  updatePost,
} from '@/features/posts/api/postsApi';
import { buildErrorMessage } from '@/utils/errorMessage';
import { FollowButton } from '@/features/profile/components/FollowButton';
import { getProfileImageUrl } from '@/utils/profileImage';
import { useImageViewer } from '@/providers/useImageViewer';

interface Props {
  post: FeedPost;
  disableNavigation?: boolean;
  allowAuthorNavigation?: boolean;
  viewerUserId?: string;
  invalidateKeys?: { queryKey: QueryKey }[];
  onDeleteSuccess?: (postId: string) => void;
  enableImagePreview?: boolean;
  onCommentClick?: () => void;
  disableCommentPreview?: boolean;
}

export const PostCard = ({
  post,
  disableNavigation,
  allowAuthorNavigation = false,
  viewerUserId,
  invalidateKeys = [],
  onDeleteSuccess,
  enableImagePreview = false,
  onCommentClick,
  disableCommentPreview = false,
}: Props) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { openImages } = useImageViewer();
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [currentContent, setCurrentContent] = useState(post.content);
  const [editedContent, setEditedContent] = useState(post.content);
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showIndicators, setShowIndicators] = useState(false);
  const indicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setLiked(post.liked);
    setLikeCount(post.likeCount);
    if (!isEditing) {
      setCurrentContent(post.content);
      setEditedContent(post.content);
    }
    setCurrentImageIndex(0);
    setShowIndicators(false);
    if (indicatorTimeoutRef.current) {
      clearTimeout(indicatorTimeoutRef.current);
      indicatorTimeoutRef.current = null;
    }
  }, [post.postId, post.liked, post.likeCount, post.images?.length, post.content, isEditing]);

  useEffect(() => {
    return () => {
      if (indicatorTimeoutRef.current) {
        clearTimeout(indicatorTimeoutRef.current);
      }
    };
  }, []);

  const invalidateRelatedQueries = (extraKeys: { queryKey: QueryKey }[] = []) => {
    const defaultInvalidate = [
      { queryKey: ['post', post.postId] },
      { queryKey: ['feed'] },
    ];
    const dedup = new Map<string, QueryKey>();
    [...defaultInvalidate, ...invalidateKeys, ...extraKeys].forEach((entry) => {
      const key = entry?.queryKey;
      if (!key) {
        return;
      }
      const serialized = JSON.stringify(key);
      if (!dedup.has(serialized)) {
        dedup.set(serialized, key);
      }
    });
    dedup.forEach((queryKey) => {
      void queryClient.invalidateQueries({ queryKey });
    });
  };

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (menuRef.current?.contains(target) || moreButtonRef.current?.contains(target)) {
        return;
      }
      setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const toggleLikeMutation = useMutation<void, unknown, boolean, { previousLiked: boolean; previousLikeCount: number }>({
    mutationFn: (nextLiked) => (nextLiked ? likePost(post.postId) : unlikePost(post.postId)),
    onMutate: (nextLiked) => {
      const context = { previousLiked: liked, previousLikeCount: likeCount };
      setLiked(nextLiked);
      return context;
    },
    onSuccess: async () => {
      try {
        const engagement = await fetchPostEngagement(post.postId);
        setLiked(engagement.liked);
        setLikeCount(engagement.likeCount);
      } catch (error) {
        toast.error(buildErrorMessage(error, '좋아요 정보를 새로고침하지 못했습니다.'));
      }

      invalidateRelatedQueries();
    },
    onError: (error, _variables, context) => {
      if (context) {
        setLiked(context.previousLiked);
        setLikeCount(context.previousLikeCount);
      }
      toast.error(buildErrorMessage(error, '좋아요 처리에 실패했습니다.'));
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: (content: string) => updatePost(post.postId, content),
    onSuccess: (updated) => {
      setIsEditing(false);
      setCurrentContent(updated.content);
      setEditedContent(updated.content);
      setLiked(updated.liked);
      setLikeCount(updated.likeCount);
      toast.success('게시글을 수정했습니다.');
      invalidateRelatedQueries();
    },
    onError: (error) => {
      toast.error(buildErrorMessage(error, '게시글을 수정하지 못했습니다.'));
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: () => deletePost(post.postId),
    onSuccess: () => {
      setIsEditing(false);
      toast.success('게시글을 삭제했습니다.');
      invalidateRelatedQueries();
      if (onDeleteSuccess) {
        onDeleteSuccess(post.postId);
      }
    },
    onError: (error) => {
      toast.error(buildErrorMessage(error, '게시글을 삭제하지 못했습니다.'));
    },
  });

  const isPostNavigable = !disableNavigation;
  const isAuthorNavigable = !disableNavigation || allowAuthorNavigation;
  const authorId = post.author.userId || post.userId;
  const shouldShowFollowButton = Boolean(viewerUserId && authorId && viewerUserId !== authorId);
  const canManagePost = Boolean(viewerUserId && authorId && viewerUserId === authorId);
  const authorAvatarUrl = getProfileImageUrl(post.author.profileImageUrl);
  const images = post.images ?? [];
  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    if (!authorId || !viewerUserId) {
      return;
    }
    if (viewerUserId !== authorId && isEditing) {
      setIsEditing(false);
      setEditedContent(currentContent);
    }
  }, [viewerUserId, authorId, isEditing, currentContent]);

  const handleAuthorClick = (event: React.MouseEvent) => {
    if (!isAuthorNavigable) {
      return;
    }
    event.stopPropagation();
    const targetUserId = post.author.userId || post.userId;
    if (!targetUserId) {
      return;
    }
    navigate(`/users/${targetUserId}`);
  };

  const navigateToComments = useCallback(() => {
    navigate(`/posts/${post.postId}/comments`);
  }, [navigate, post.postId]);

  const handlePostClick = () => {
    if (!isPostNavigable) {
      return;
    }
    navigateToComments();
  };

  const handleLikeClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (toggleLikeMutation.isPending) {
      return;
    }
    toggleLikeMutation.mutate(!liked);
  };

  const handleCommentMetaClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onCommentClick) {
      onCommentClick();
      return;
    }
    navigateToComments();
  };

  const imageUrls = images.map((image) => image.imageUrl).filter((url) => Boolean(url));

  const shouldShowCommentPreview = !disableCommentPreview && post.commentCount > 0;
  const {
    data: previewData,
    isLoading: isPreviewLoading,
  } = useQuery({
    queryKey: ['post', post.postId, 'comments', 'preview'],
    enabled: shouldShowCommentPreview,
    staleTime: 30_000,
    queryFn: () => fetchPostComments(post.postId, { limit: 2 }),
  });
  const previewComments = previewData?.comments ?? [];

  const handleImagePreview = (imageIndex: number) => (event: React.MouseEvent<HTMLImageElement>) => {
    event.stopPropagation();
    if (!enableImagePreview || imageUrls.length === 0) {
      return;
    }
    openImages(imageUrls, imageIndex, '게시글 이미지');
  };

  const beginEditing = () => {
    if (!canManagePost || updatePostMutation.isPending || deletePostMutation.isPending) {
      return;
    }
    setEditedContent(currentContent);
    setIsEditing(true);
  };

  const handleEditSelection = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsMenuOpen(false);
    beginEditing();
  };

  const handleCancelEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (updatePostMutation.isPending) {
      return;
    }
    setEditedContent(currentContent);
    setIsEditing(false);
  };

  const handleSaveEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!canManagePost || updatePostMutation.isPending) {
      return;
    }
    const trimmed = editedContent.trim();
    if (!trimmed) {
      toast.error('게시글 내용을 입력하세요.');
      return;
    }
    if (trimmed === currentContent.trim()) {
      setIsEditing(false);
      return;
    }
    updatePostMutation.mutate(trimmed);
  };

  const handleDeleteSelection = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!canManagePost || deletePostMutation.isPending || updatePostMutation.isPending) {
      return;
    }
    setIsMenuOpen(false);
    if (!window.confirm('게시글을 삭제하시겠습니까?')) {
      return;
    }
    deletePostMutation.mutate();
  };

  const handleToggleMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!canManagePost) {
      return;
    }
    setIsMenuOpen((prev) => !prev);
  };

  const flashIndicators = () => {
    if (!hasMultipleImages) {
      return;
    }
    setShowIndicators(true);
    if (indicatorTimeoutRef.current) {
      clearTimeout(indicatorTimeoutRef.current);
    }
    indicatorTimeoutRef.current = setTimeout(() => {
      setShowIndicators(false);
      indicatorTimeoutRef.current = null;
    }, 1500);
  };

  const handlePrevImage = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!images.length) {
      return;
    }
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    flashIndicators();
  };

  const handleNextImage = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!images.length) {
      return;
    }
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
    flashIndicators();
  };

  const handlePreviewClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onCommentClick) {
      onCommentClick();
      return;
    }
    navigateToComments();
  };

  return (
    <article
      className={`post-card ${isPostNavigable ? 'post-card--clickable' : ''}`}
      onClick={handlePostClick}
      role={isPostNavigable ? 'button' : undefined}
      tabIndex={isPostNavigable ? 0 : undefined}
    >
      <header
        className={`post-card__header ${isAuthorNavigable ? 'post-card__header--clickable' : ''}`}
        onClick={handleAuthorClick}
        role={isAuthorNavigable ? 'button' : undefined}
        tabIndex={isAuthorNavigable ? 0 : undefined}
      >
        <div className="post-card__author-cluster">
          <div className="post-card__author-info">
            <div className="post-card__avatar">
              <img src={authorAvatarUrl} alt={post.author.nickname} loading="lazy" />
            </div>
            <div className="post-card__author-meta">
              <div className="post-card__author-row">
                <span className="post-card__author">{post.author.nickname}</span>
                {authorId ? <span className="post-card__username">@{authorId}</span> : null}
              </div>
              <div className="post-card__time">{formatRelativeTime(post.postedAt)}</div>
            </div>
          </div>
          <div className="post-card__author-controls">
            {shouldShowFollowButton && authorId ? (
              <div className="post-card__follow-wrapper">
                <FollowButton
                  userId={authorId}
                  fetchStatus
                  invalidateKeys={[
                    { queryKey: ['user', authorId] },
                    { queryKey: ['feed'] },
                    { queryKey: ['post', post.postId] },
                  ]}
                  className="post-card__follow-btn"
                />
              </div>
            ) : null}
            {canManagePost ? (
              <div className="post-card__menu-wrapper" ref={menuRef}>
                <button
                  type="button"
                  className="post-card__more-button"
                  onClick={handleToggleMenu}
                  ref={moreButtonRef}
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                  aria-label="게시글 관리 메뉴"
                >
                  <EllipsisVertical size={18} />
                </button>
                {isMenuOpen ? (
                  <div className="post-card__menu" role="menu">
                    <button type="button" role="menuitem" onClick={handleEditSelection}>
                      수정
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="post-card__menu-item--danger"
                      onClick={handleDeleteSelection}
                    >
                      삭제
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>
      {isEditing ? (
        <div className="post-card__editor" onClick={(event) => event.stopPropagation()}>
          <textarea
            value={editedContent}
            onChange={(event) => setEditedContent(event.target.value)}
            className="post-card__editor-textarea"
            rows={4}
            disabled={updatePostMutation.isPending}
          />
          <div className="post-card__editor-actions">
            <button
              type="button"
              className="post-card__editor-btn"
              onClick={handleCancelEdit}
              disabled={updatePostMutation.isPending}
            >
              취소
            </button>
            <button
              type="button"
              className="post-card__editor-btn post-card__editor-btn--primary"
              onClick={handleSaveEdit}
              disabled={updatePostMutation.isPending}
            >
              {updatePostMutation.isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      ) : (
        <p className="post-card__content">{currentContent}</p>
      )}
      {images.length ? (
        <div className="post-card__carousel" onClick={(event) => event.stopPropagation()}>
          <div
            className="post-card__carousel-track"
            style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
          >
            {images.map((image, index) => {
              const imageKey = `${image.imageId}-${image.imageOrder}`;
              return (
                <div key={imageKey} className="post-card__carousel-slide">
                  <div className="post-card__image-wrapper">
                    <img
                      src={image.imageUrl}
                      alt="post"
                      loading="lazy"
                      onClick={handleImagePreview(index)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {hasMultipleImages ? (
            <>
              <button
                type="button"
                className="post-card__carousel-control post-card__carousel-control--prev"
                onClick={handlePrevImage}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="post-card__carousel-control post-card__carousel-control--next"
                onClick={handleNextImage}
              >
                <ChevronRight size={20} />
              </button>
              <div
                className={`post-card__carousel-indicators ${
                  showIndicators ? 'post-card__carousel-indicators--visible' : ''
                }`}
              >
                {images.map((image, index) => (
                  <span
                    key={`${image.imageId}-${image.imageOrder}-indicator`}
                    className={`post-card__carousel-indicator ${
                      index === currentImageIndex ? 'post-card__carousel-indicator--active' : ''
                    }`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
      {shouldShowCommentPreview ? (
        <button
          type="button"
          className="post-comments-preview post-comments-preview--inline"
          onClick={handlePreviewClick}
        >
          <div className="post-comments-preview__title">
            댓글 {post.commentCount.toLocaleString()}개 모두 보기
          </div>
          <ul className="post-comments-preview__list">
            {previewComments.length > 0
              ? previewComments.map((comment) => (
                  <li key={comment.commentId} className="post-comments-preview__item">
                    <span className="post-comments-preview__author">{comment.commenter.nickname}</span>
                    <span className="post-comments-preview__content">{comment.content}</span>
                  </li>
                ))
              : (
                  <li className="post-comments-preview__item post-comments-preview__item--placeholder">
                    {isPreviewLoading ? (
                      <BouncingDotsLoader size="sm" message="댓글을 불러오는 중입니다..." />
                    ) : (
                      '댓글을 불러오지 못했습니다.'
                    )}
                  </li>
                )}
          </ul>
        </button>
      ) : null}
      <footer className="post-card__footer" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className={`post-card__action ${liked ? 'post-card__action--active' : ''}`}
          onClick={handleLikeClick}
          disabled={toggleLikeMutation.isPending}
        >
          <Heart
            size={18}
            className="post-card__action-icon"
            color={liked ? '#ff5f6d' : '#475467'}
            fill={liked ? '#ff5f6d' : 'none'}
          />
          <span>{likeCount}</span>
        </button>
        <button
          type="button"
          className="post-card__meta post-card__meta-button"
          onClick={handleCommentMetaClick}
          aria-label="댓글 보기"
        >
          <MessageSquare size={18} />
          <span>{post.commentCount}</span>
        </button>
        <div className="post-card__meta">
          <Eye size={18} />
          <span>{post.viewCount}</span>
        </div>
      </footer>
    </article>
  );
};
