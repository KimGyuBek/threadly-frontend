import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, MessageSquare, Eye } from 'lucide-react';
import { toast } from 'react-toastify';

import type { FeedPost } from '../types';
import { formatRelativeTime } from '@/utils/date';
import { likePost, unlikePost } from '@/features/posts/api/postsApi';
import { buildErrorMessage } from '@/utils/errorMessage';

interface Props {
  post: FeedPost;
  disableNavigation?: boolean;
}

export const PostCard = ({ post, disableNavigation }: Props) => {
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

  const handleAuthorClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (disableNavigation) {
      return;
    }
    const targetUserId = post.author.userId || post.userId;
    if (!targetUserId) {
      return;
    }
    navigate(`/users/${targetUserId}`);
  };

  const handlePostClick = () => {
    if (disableNavigation) {
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
      className={`post-card ${disableNavigation ? '' : 'post-card--clickable'}`}
      onClick={handlePostClick}
      role={disableNavigation ? undefined : 'button'}
      tabIndex={disableNavigation ? undefined : 0}
    >
      <header
        className={`post-card__header ${disableNavigation ? '' : 'post-card__header--clickable'}`}
        onClick={handleAuthorClick}
        role={disableNavigation ? undefined : 'button'}
        tabIndex={disableNavigation ? undefined : 0}
      >
        <div className="post-card__avatar">
          {post.author.profileImageUrl ? (
            <img src={post.author.profileImageUrl} alt={post.author.nickname} loading="lazy" />
          ) : (
            <span>{post.author.nickname?.charAt(0) ?? '?'}</span>
          )}
        </div>
        <div>
          <div className="post-card__author">{post.author.nickname}</div>
          <div className="post-card__time">{formatRelativeTime(post.postedAt)}</div>
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
