import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import { fetchMyProfile, fetchUserFollowStats } from '@/features/profile/api/profileApi';
import { buildErrorMessage } from '@/utils/errorMessage';
import { isAxiosError } from 'axios';
import { isThreadlyApiError } from '@/utils/threadlyError';
import { getProfileImageUrl } from '@/utils/profileImage';

const MyProfileSummaryPage = () => {
  const navigate = useNavigate();

  const profileQuery = useQuery({
    queryKey: ['me', 'profile', 'summary'],
    queryFn: fetchMyProfile,
    retry: (count, error) => {
      const message = buildErrorMessage(error, '프로필 정보를 불러오지 못했습니다.');
      if (count === 1) {
        toast.error(message);
      }
      return count < 2;
    },
  });

  const profile = profileQuery.data;
  const userId = profile?.userId;

  const followStatsQuery = useQuery({
    queryKey: ['followStats', userId, 'summary'],
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

  const followStats = followStatsQuery.data;
  const followerCount = followStatsQuery.isSuccess
    ? followStats?.followerCount ?? profile?.followerCount ?? 0
    : profile?.followerCount ?? 0;
  const followingCount = followStatsQuery.isSuccess
    ? followStats?.followingCount ?? profile?.followingCount ?? 0
    : profile?.followingCount ?? 0;

  const summaryItems = useMemo(
    () => [
      { label: '팔로워', value: followerCount },
      { label: '팔로잉', value: followingCount },
      { label: '게시물', value: '-' },
    ],
    [followerCount, followingCount],
  );

  if (profileQuery.isLoading) {
    return <div className="profile-container">프로필을 불러오는 중...</div>;
  }

  if (!profile) {
    return (
      <div className="feed-placeholder feed-placeholder--error">
        <p>프로필 정보를 불러오지 못했습니다.</p>
        <button type="button" className="btn" onClick={() => navigate(-1)}>
          뒤로가기
        </button>
      </div>
    );
  }

  const initial = profile.nickname?.charAt(0) ?? profile.userId.charAt(0);
  const avatarUrl = getProfileImageUrl(profile.profileImageUrl);

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar">
          <img src={avatarUrl} alt={profile.nickname ?? initial} />
        </div>
        <div>
          <h2>{profile.nickname}</h2>
          <p className="profile-username">@{profile.userId}</p>
          {profile.statusMessage ? <p className="profile-status">{profile.statusMessage}</p> : null}
        </div>
      </div>

      <div className="profile-summary-card">
        <div className="profile-summary-grid">
          {summaryItems.map(({ label, value }) => (
            <div key={label} className="profile-summary-item">
              <span className="profile-summary-count">{value?.toLocaleString?.() ?? value}</span>
              <span className="profile-summary-label">{label}</span>
            </div>
          ))}
        </div>
        <div className="profile-summary-actions">
          <button type="button" className="btn btn--primary" onClick={() => navigate('/profile')}>
            돌아가기
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/profile/setup')}>
            프로필 수정
          </button>
        </div>
      </div>

      <div className="profile-section">
        <h3>소개</h3>
        <p>{profile.bio || '자기소개가 없습니다.'}</p>
      </div>

      <div className="profile-section">
        <h3>세부 정보</h3>
        <ul className="profile-details">
          <li>
            <span>연락처</span>
            <span>{profile.phone || '-'}</span>
          </li>
          <li>
            <span>성별</span>
            <span>{profile.genderType || '-'}</span>
          </li>
          <li>
            <span>공개 여부</span>
            <span>{profile.isPrivate ? '비공개' : '공개'}</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default MyProfileSummaryPage;
