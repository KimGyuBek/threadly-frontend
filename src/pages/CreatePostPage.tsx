import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { createPost, uploadPostImages } from '@/features/posts/api/postsApi';
import type { UploadedPostImage } from '@/features/posts/types';
import { buildErrorMessage } from '@/utils/errorMessage';

const CreatePostPage = () => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<UploadedPostImage[]>([]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () =>
      createPost({
        content: content.trim(),
        images: images.map((image, index) => ({ imageId: image.imageId, imageOrder: index })),
      }),
    onSuccess: () => {
      toast.success('게시글이 등록되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      setContent('');
      setImages([]);
      navigate('/');
    },
    onError: (error: unknown) => {
      toast.error(buildErrorMessage(error, '게시글 작성에 실패했습니다.'));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: uploadPostImages,
    onSuccess: (uploaded) => {
      if (uploaded.length === 0) {
        toast.info('선택한 이미지가 없습니다.');
        return;
      }
      setImages((prev) => [...prev, ...uploaded]);
      toast.success('이미지를 업로드했어요.');
    },
    onError: (error: unknown) => {
      toast.error(buildErrorMessage(error, '이미지 업로드에 실패했습니다.'));
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!content.trim()) {
      toast.error('내용을 입력하세요.');
      return;
    }
    if (uploadMutation.isPending) {
      toast.info('이미지 업로드가 완료될 때까지 기다려 주세요.');
      return;
    }
    createMutation.mutate();
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    if (files.length === 0) {
      return;
    }
    try {
      await uploadMutation.mutateAsync(files);
    } catch {
      // error toast handled in mutation onError
    }
  };

  const handleRemoveImage = (imageId: string) => {
    setImages((prev) => prev.filter((image) => image.imageId !== imageId));
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
          disabled={createMutation.isPending || uploadMutation.isPending}
        />
        <div className="compose-upload">
          <label className="btn btn--secondary" htmlFor="post-image-upload">
            {uploadMutation.isPending ? '이미지 업로드 중...' : '이미지 선택'}
          </label>
          <input
            id="post-image-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            style={{ display: 'none' }}
            disabled={uploadMutation.isPending || createMutation.isPending}
          />
        </div>
        {images.length > 0 && (
          <div
            className="compose-image-preview"
            style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}
          >
            {images.map((image, index) => (
              <div
                key={image.imageId}
                className="compose-image-preview__item"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
              >
                <img
                  src={image.imageUrl}
                  alt={`첨부 이미지 ${index + 1}`}
                  style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }}
                />
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => handleRemoveImage(image.imageId)}
                  disabled={createMutation.isPending}
                >
                  제거
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="compose-actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={createMutation.isPending || uploadMutation.isPending}
          >
            {createMutation.isPending ? '게시 중...' : '게시하기'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePostPage;
