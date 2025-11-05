import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { createPost } from '@/features/posts/api/postsApi';
import { buildErrorMessage } from '@/utils/errorMessage';

const CreatePostPage = () => {
  const [content, setContent] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () => createPost({ content: content.trim() }),
    onSuccess: () => {
      toast.success('게시글이 등록되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      setContent('');
      navigate('/');
    },
    onError: (error: unknown) => {
      toast.error(buildErrorMessage(error, '게시글 작성에 실패했습니다.'));
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!content.trim()) {
      toast.error('내용을 입력하세요.');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="compose-container">
      <h2 className="section-title">게시글 작성</h2>
      <form className="compose-form" onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="지금 무슨 생각을 하고 있나요?"
          rows={8}
          className="compose-textarea"
          disabled={createMutation.isPending}
        />
        <div className="compose-actions">
          <button type="submit" className="btn btn--primary" disabled={createMutation.isPending}>
            {createMutation.isPending ? '게시 중...' : '게시하기'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePostPage;
