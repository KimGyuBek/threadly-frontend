import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { Heart, MessageSquare, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';

import type { FeedPost } from '../types';
import { formatRelativeTime } from '@/utils/date';
import { fetchPostEngagement, likePost, unlikePost } from '@/features/posts/api/postsApi';
import { buildErrorMessage } from '@/utils/errorMessage';
import { FollowButton } from '@/features/profile/components/FollowButton';
import { getProfileImageUrl } from '@/utils/profileImage';

const TARGET_IMAGE_ASPECT_RATIO = 3 / 4;
const IMAGE_RATIO_TOLERANCE = 0.05;

interface Props {
  post: FeedPost;
  disableNavigation?: boolean;
  allowAuthorNavigation?: boolean;
  viewerUserId?: string;
  invalidateKeys?: { queryKey: QueryKey }[];
}

export const PostCard = ({
  post,
  disableNavigation,
  allowAuthorNavigation = false,
  viewerUserId,
  invalidateKeys = [],
}: Props) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [imageFitMap, setImageFitMap] = useState<Record<string, 'cover' | 'letterbox'>>({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showIndicators, setShowIndicators] = useState(false);
  const indicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLiked(post.liked);
    setLikeCount(post.likeCount);
    setImageFitMap({});
    setCurrentImageIndex(0);
    setShowIndicators(false);
    if (indicatorTimeoutRef.current) {
      clearTimeout(indicatorTimeoutRef.current);
      indicatorTimeoutRef.current = null;
    }
  }, [post.postId, post.liked, post.likeCount, post.images?.length]);

  useEffect(() => {
    return () => {
      if (indicatorTimeoutRef.current) {
        clearTimeout(indicatorTimeoutRef.current);
      }
    };
  }, []);

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

      const defaultInvalidate = [
        { queryKey: ['post', post.postId] },
        { queryKey: ['feed'] },
      ];
      const dedup = new Map<string, QueryKey>();
      [...defaultInvalidate, ...invalidateKeys].forEach((entry) => {
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
    },
    onError: (error, _variables, context) => {
      if (context) {
        setLiked(context.previousLiked);
        setLikeCount(context.previousLikeCount);
      }
      toast.error(buildErrorMessage(error, '좋아요 처리에 실패했습니다.'));
    },
  });

  const isPostNavigable = !disableNavigation;
  const isAuthorNavigable = !disableNavigation || allowAuthorNavigation;
  const authorId = post.author.userId || post.userId;
  const shouldShowFollowButton = Boolean(viewerUserId && authorId && viewerUserId !== authorId);
  const authorAvatarUrl = getProfileImageUrl(post.author.profileImageUrl);
  const images = post.images ?? [];
  const hasMultipleImages = images.length > 1;

  const handleImageLoad = (imageKey: string) => (event: React.SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget;
    if (!target?.naturalWidth || !target?.naturalHeight) {
      return;
    }
    const ratio = target.naturalWidth / target.naturalHeight;
    const nextFit: 'cover' | 'letterbox' =
      Math.abs(ratio - TARGET_IMAGE_ASPECT_RATIO) <= IMAGE_RATIO_TOLERANCE ? 'cover' : 'letterbox';
    setImageFitMap((prev) => {
      if (prev[imageKey] === nextFit) {
        return prev;
      }
      return { ...prev, [imageKey]: nextFit };
    });
  };

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

  const handlePostClick = () => {
    if (!isPostNavigable) {
      return;
    }
    navigate(`/posts/${post.postId}`);
  };

  const handleLikeClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (toggleLikeMutation.isPending) {
      return;
    }
    toggleLikeMutation.mutate(!liked);
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
        </div>
      </header>
      <p className="post-card__content">{post.content}</p>
      {images.length ? (
        <div className="post-card__carousel" onClick={(event) => event.stopPropagation()}>
          <div
            className="post-card__carousel-track"
            style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
          >
            {images.map((image) => {
              const imageKey = `${image.imageId}-${image.imageOrder}`;
              const isLetterbox = imageFitMap[imageKey] === 'letterbox';
              return (
                <div key={imageKey} className="post-card__carousel-slide">
                  <div
                    className={`post-card__image-wrapper ${isLetterbox ? 'post-card__image-wrapper--letterbox' : 'post-card__image-wrapper--cover'}`}
                  >
                    <img src={image.imageUrl} alt="post" loading="lazy" onLoad={handleImageLoad(imageKey)} />
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
      <footer className="post-card__footer" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className={`post-card__action ${liked ? 'post-card__action--active' : ''}`}
          onClick={handleLikeClick}
          disabled={toggleLikeMutation.isPending}
        >
          <Heart size={18} />
          <span>{likeCount}</span>
        </button>
        <div className="post-card__meta">
          <MessageSquare size={18} />
          <span>{post.commentCount}</span>
        </div>
        <div className="post-card__meta">
          <Eye size={18} />
          <span>{post.viewCount}</span>
        </div>
      </footer>
    </article>
  );
};
