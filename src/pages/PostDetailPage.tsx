import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { fetchPostDetail } from '@/features/posts/api/postsApi';
import { buildErrorMessage } from '@/utils/errorMessage';
import { PostCard } from '@/features/posts/components/PostCard';

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
        <PostCard post={detailQuery.data} disableNavigation />
      </div>
    </div>
  );
};

export default PostDetailPage;
