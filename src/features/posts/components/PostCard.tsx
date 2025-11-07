import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, MessageSquare, Eye } from 'lucide-react';
import { toast } from 'react-toastify';

import type { FeedPost } from '../types';
import { formatRelativeTime } from '@/utils/date';
import { likePost, unlikePost } from '@/features/posts/api/postsApi';
import { buildErrorMessage } from '@/utils/errorMessage';
import { fetchUserProfile } from '@/features/profile/api/profileApi';
import { useFollowActions } from '@/hooks/useFollowActions';

interface Props {
  post: FeedPost;
  disableNavigation?: boolean;
  allowAuthorNavigation?: boolean;
  viewerUserId?: string;
}

export const PostCard = ({ post, disableNavigation, allowAuthorNavigation = false, viewerUserId }: Props) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);

  useEffect(() => {
    setLiked(post.isLiked);
    setLikeCount(post.likeCount);
  }, [post.postId, post.isLiked, post.likeCount]);

  const toggleLikeMutation = useMutation<
    void,
    unknown,
    boolean,
    { previousLiked: boolean; previousLikeCount: number }
  >({
    mutationFn: (nextLiked) => (nextLiked ? likePost(post.postId) : unlikePost(post.postId)),
    onMutate: (nextLiked) => {
      const context = { previousLiked: liked, previousLikeCount: likeCount };
      setLiked(nextLiked);
      setLikeCount((prev) => prev + (nextLiked ? 1 : -1));
      return context;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['post', post.postId] });
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
              {post.author.profileImageUrl ? (
                <img src={post.author.profileImageUrl} alt={post.author.nickname} loading="lazy" />
              ) : (
                <span>{post.author.nickname?.charAt(0) ?? '?'}</span>
              )}
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
            <div className="post-card__follow-wrapper" onClick={(event) => event.stopPropagation()}>
              <AuthorFollowButton authorId={authorId} postId={post.postId} />
            </div>
          ) : null}
        </div>
      </header>
      <p className="post-card__content">{post.content}</p>
      {post.images?.length ? (
        <div className="post-card__images">
          {post.images.map((image) => (
            <img key={`${image.imageId}-${image.imageOrder}`} src={image.imageUrl} alt="post" loading="lazy" />
          ))}
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

interface AuthorFollowButtonProps {
  authorId: string;
  postId?: string;
}

const AuthorFollowButton = ({ authorId, postId }: AuthorFollowButtonProps) => {
  const authorProfileQuery = useQuery({
    queryKey: ['user', authorId],
    queryFn: () => fetchUserProfile(authorId),
    enabled: Boolean(authorId),
    staleTime: 60_000,
  });

  const followStatus = authorProfileQuery.data?.followStatus ?? 'NONE';

  const followActions = useFollowActions({
    userId: authorId,
    followStatus,
    invalidateKeys: [
      { queryKey: ['user', authorId] },
      { queryKey: ['feed'] },
      ...(postId ? [{ queryKey: ['post', postId] }] : []),
    ],
  });

  const label = followActions.buttonLabel;

  if (!label) {
    return null;
  }

  const buttonClass =
    followActions.followStatus === 'APPROVED' ? 'btn btn--secondary' : 'btn btn--primary';

  return (
    <button
      type="button"
      className={`${buttonClass} post-card__follow-btn`}
      onClick={(event) => {
        event.stopPropagation();
        followActions.toggleFollow();
      }}
      disabled={followActions.isProcessing}
    >
      {followActions.isProcessing ? '처리 중...' : label}
    </button>
  );
};
