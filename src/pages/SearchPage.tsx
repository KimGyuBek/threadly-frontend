import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { searchPosts } from '@/features/posts/api/postsApi';
import type { FeedPost, FeedResponse } from '@/features/posts/types';
import { PostCard } from '@/features/posts/components/PostCard';
import { buildErrorMessage } from '@/utils/errorMessage';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const SearchPage = () => {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<FeedPost[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const debouncedKeyword = useDebouncedValue(keyword, 400);
  const lastRequestedRef = useRef('');

  const searchMutation = useMutation<FeedResponse, unknown, string>({
    mutationFn: (term) => searchPosts(term),
    onMutate: (term) => {
      if (!term) {
        return;
      }
      setHasSearched(true);
    },
    onSuccess: (data: FeedResponse) => {
      setResults(data.content ?? []);
    },
    onError: (error: unknown) => {
      setHasSearched(true);
      setResults([]);
      const message = buildErrorMessage(error, '검색에 실패했습니다.');
      alert(message);
    },
  });

  const { mutate, reset, isPending } = searchMutation;

  useEffect(() => {
    const term = debouncedKeyword.trim();
    if (!term) {
      if (lastRequestedRef.current) {
        lastRequestedRef.current = '';
      }
      setResults([]);
      setHasSearched(false);
      reset();
      return;
    }
    if (term === lastRequestedRef.current) {
      return;
    }
    lastRequestedRef.current = term;
    mutate(term);
  }, [debouncedKeyword, mutate, reset]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = keyword.trim();
    if (!trimmed) {
      setKeyword('');
      setResults([]);
      setHasSearched(false);
      lastRequestedRef.current = '';
      reset();
      return;
    }
    lastRequestedRef.current = trimmed;
    setKeyword(trimmed);
    mutate(trimmed);
  };

  return (
    <div className="search-container">
      <h2 className="section-title">검색</h2>
      <form className="search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="게시글 내용을 검색하세요"
          className="search-input"
        />
      </form>

      {isPending ? (
        <div className="feed-placeholder">검색 중...</div>
      ) : hasSearched && results.length === 0 ? (
        <div className="feed-placeholder">검색 결과가 없습니다.</div>
      ) : (
        <div className="feed-list">
          {results.map((post) => (
            <PostCard key={post.postId} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
