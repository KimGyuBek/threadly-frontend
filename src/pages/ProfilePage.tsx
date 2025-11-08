import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import { fetchMyProfile, fetchUserFollowStats } from '@/features/profile/api/profileApi';
import FollowListModal from '@/features/profile/components/FollowListModal';
import type { FollowListType } from '@/features/profile/components/FollowListModal';
import { UserPostsSection } from '@/features/posts/components/UserPostsSection';
import { buildErrorMessage } from '@/utils/errorMessage';
import { isAxiosError } from 'axios';
import { isThreadlyApiError } from '@/utils/threadlyError';
import { getProfileImageUrl } from '@/utils/profileImage';

const ProfilePage = () => {
  const navigate = useNavigate();
  const profileQuery = useQuery({
    queryKey: ['me', 'profile', 'detail'],
    queryFn: fetchMyProfile,
    retry: (count, error) => {
      const message = buildErrorMessage(error, '프로필을 불러오지 못했습니다.');
      if (count === 1) {
        toast.error(message);
      }
      return count < 2;
    },
  });

  const profile = profileQuery.data;
  const userId = profile?.userId;

  const {
    data: followStats,
    isSuccess: followStatsSuccess,
  } = useQuery({
    queryKey: ['followStats', userId],
    enabled: Boolean(userId?.length),
    retry: false,
    queryFn: async () => {
      if (!userId) {
        return null;
      }
      try {
        return await fetchUserFollowStats(userId, { skipAuthRetry: true });
      } catch (error) {
        if (
          isThreadlyApiError(error) &&
          (error.status === 401 || error.status === 403 || error.code === 'TLY2006')
        ) {
          return null;
        }
        if (isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
          return null;
        }
        throw error;
      }
    },
  });

  const followerCount = followStatsSuccess
    ? followStats?.followerCount ?? profile?.followerCount ?? 0
    : profile?.followerCount ?? 0;
  const followingCount = followStatsSuccess
    ? followStats?.followingCount ?? profile?.followingCount ?? 0
    : profile?.followingCount ?? 0;

  const [activeList, setActiveList] = useState<FollowListType | null>(null);

  const openList = (listType: FollowListType) => setActiveList(listType);
  const closeList = () => setActiveList(null);

  const handleEditProfile = () => {
    navigate('/profile/setup');
  };

  const handleViewSummary = () => {
    navigate('/profile/details');
  };

  if (profileQuery.isLoading) {
    return <div className="profile-container">프로필을 불러오는 중입니다...</div>;
  }

  if (!profile) {
    return (
      <div className="feed-placeholder feed-placeholder--error">
        <p>프로필을 불러오지 못했습니다.</p>
        <button type="button" className="btn" onClick={() => navigate(-1)}>
          뒤로가기
        </button>
      </div>
    );
  }

  const displayName = profile.nickname;
  const initial = displayName?.charAt(0) ?? profile.userId.charAt(0);
  const avatarUrl = getProfileImageUrl(profile.profileImageUrl);

  return (
    <div className="profile-container">
      <button type="button" className="btn btn--secondary" onClick={() => navigate(-1)}>
        뒤로가기
      </button>
      <div className="profile-header">
        <div className="profile-avatar">
          <img src={avatarUrl} alt={displayName ?? initial} />
        </div>
        <div>
          <h2>{displayName}</h2>
          <p className="profile-username">@{profile.userId}</p>
          {profile.statusMessage ? <p className="profile-status">{profile.statusMessage}</p> : null}
          <div className="profile-stats">
            <button type="button" className="profile-stat" onClick={() => openList('followers')}>
              <span className="profile-stat-count">{followerCount.toLocaleString()}</span>
              <span className="profile-stat-label">팔로워</span>
            </button>
            <button type="button" className="profile-stat" onClick={() => openList('followings')}>
              <span className="profile-stat-count">{followingCount.toLocaleString()}</span>
              <span className="profile-stat-label">팔로잉</span>
            </button>
          </div>
        </div>
        <div className="profile-summary-actions">
          <button type="button" className="btn btn--primary" onClick={handleEditProfile}>
            프로필 수정
          </button>
          <button type="button" className="btn btn--secondary" onClick={handleViewSummary}>
            상세보기
          </button>
        </div>
      </div>

      <div className="profile-section">
        <h3>소개</h3>
        <p>{profile.bio || '자기소개가 없습니다.'}</p>
      </div>

      <UserPostsSection userId={profile.userId} viewerUserId={profile.userId} />

      <FollowListModal
        userId={profile.userId}
        type={activeList ?? 'followers'}
        isOpen={Boolean(activeList)}
        onClose={closeList}
      />
    </div>
  );
};

export default ProfilePage;
