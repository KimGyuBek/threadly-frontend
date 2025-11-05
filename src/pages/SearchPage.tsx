import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { searchPosts } from '@/features/posts/api/postsApi';
import type { FeedPost, FeedResponse } from '@/features/posts/types';
import { PostCard } from '@/features/posts/components/PostCard';
import { buildErrorMessage } from '@/utils/errorMessage';

const SearchPage = () => {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<FeedPost[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const searchMutation = useMutation({
    mutationFn: () => searchPosts(keyword.trim()),
    onSuccess: (data: FeedResponse) => {
      setResults(data.content ?? []);
      setHasSearched(true);
    },
    onError: (error: unknown) => {
      setHasSearched(true);
      setResults([]);
      const message = buildErrorMessage(error, '검색에 실패했습니다.');
      alert(message);
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!keyword.trim()) {
      return;
    }
    searchMutation.mutate();
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
          disabled={searchMutation.isPending}
        />
        <button type="submit" className="btn" disabled={searchMutation.isPending}>
          {searchMutation.isPending ? '검색 중...' : '검색'}
        </button>
      </form>

      {searchMutation.isPending ? (
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
