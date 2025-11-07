import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { searchPosts } from '@/features/posts/api/postsApi';
import { PostCard } from '@/features/posts/components/PostCard';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { searchUsers } from '@/features/search/api/searchApi';
import type { SearchTab } from '@/features/search/types';
import { UserSearchList } from '@/features/search/components/UserSearchList';
import { buildErrorMessage } from '@/utils/errorMessage';
import { useMyProfileQuery } from '@/hooks/useMyProfile';

const SearchPage = () => {
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('users');
  const debouncedKeyword = useDebouncedValue(keyword, 400);
  const trimmedKeyword = debouncedKeyword.trim();
  const hasKeyword = trimmedKeyword.length > 0;

  const myProfileQuery = useMyProfileQuery();
  const viewerUserId = myProfileQuery.data?.userId;

  const userSearchQuery = useQuery({
    queryKey: ['search', 'users', trimmedKeyword],
    queryFn: () => searchUsers(trimmedKeyword),
    enabled: hasKeyword,
    staleTime: 60_000,
  });

  const postSearchQuery = useQuery({
    queryKey: ['search', 'posts', trimmedKeyword],
    queryFn: () => searchPosts(trimmedKeyword),
    enabled: hasKeyword,
    staleTime: 60_000,
  });

  const isUsersTab = activeTab === 'users';
  const activeQuery = isUsersTab ? userSearchQuery : postSearchQuery;
  const isLoading = hasKeyword && (activeQuery.isPending || activeQuery.isFetching);
  const hasError = hasKeyword && activeQuery.isError;
  const errorMessage = hasError
    ? buildErrorMessage(activeQuery.error, '검색에 실패했습니다.')
    : null;

  const userResults = userSearchQuery.data?.users ?? [];
  const postResults = postSearchQuery.data?.content ?? [];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
  };

  const renderResults = () => {
    if (!hasKeyword) {
      return <div className="feed-placeholder">검색어를 입력하세요.</div>;
    }

    if (isLoading) {
      return <div className="feed-placeholder">검색 중...</div>;
    }

    if (hasError && errorMessage) {
      return <div className="feed-placeholder feed-placeholder--error">{errorMessage}</div>;
    }

    if (isUsersTab) {
      if (userResults.length === 0) {
        return <div className="feed-placeholder">계정을 찾지 못했습니다.</div>;
      }
      return <UserSearchList users={userResults} />;
    }

    if (postResults.length === 0) {
      return <div className="feed-placeholder">게시글을 찾지 못했습니다.</div>;
    }

    return (
      <div className="feed-list">
        {postResults.map((post) => (
          <PostCard key={post.postId} post={post} viewerUserId={viewerUserId} />
        ))}
      </div>
    );
  };

  return (
    <div className="search-container">
      <h2 className="section-title">검색</h2>
      <form className="search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="계정 또는 게시글을 검색하세요"
          className="search-input"
        />
      </form>

      <div className="search-tabs-wrapper">
        <div className="search-tabs" role="tablist" aria-label="검색 유형">
          <button
            type="button"
            role="tab"
            aria-selected={isUsersTab}
            className={`search-tab ${isUsersTab ? 'search-tab--active' : ''}`}
            onClick={() => handleTabChange('users')}
          >
            계정
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isUsersTab}
            className={`search-tab ${!isUsersTab ? 'search-tab--active' : ''}`}
            onClick={() => handleTabChange('posts')}
          >
            게시글
          </button>
        </div>
      </div>

      {renderResults()}
    </div>
  );
};

export default SearchPage;
