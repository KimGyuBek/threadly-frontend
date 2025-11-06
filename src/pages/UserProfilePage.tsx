import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
  fetchUserFollowStats,
  fetchUserProfile,
} from '@/features/profile/api/profileApi';
import FollowListModal from '@/features/profile/components/FollowListModal';
import type { FollowListType } from '@/features/profile/components/FollowListModal';
import { buildErrorMessage } from '@/utils/errorMessage';
import { useFollowActions } from '@/hooks/useFollowActions';
import { useAuthStore } from '@/store/authStore';
import { isAxiosError } from 'axios';
import { isThreadlyApiError } from '@/utils/threadlyError';

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const hasAccessToken = useAuthStore((state) => Boolean(state.tokens?.accessToken));

  const profileQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUserProfile(userId ?? ''),
    enabled: Boolean(userId),
    retry: (count, error) => {
      const message = buildErrorMessage(error, '프로필을 불러오지 못했습니다.');
      if (count === 1) {
        toast.error(message);
      }
      return count < 2;
    },
  });

  const profile = profileQuery.data;
  const targetUserId = profile?.user.userId;

  const followStatsQuery = useQuery({
    queryKey: ['followStats', targetUserId],
    enabled: Boolean(targetUserId && hasAccessToken),
    retry: false,
    queryFn: async () => {
      if (!targetUserId) {
        return null;
      }
      try {
        return await fetchUserFollowStats(targetUserId, { skipAuthRetry: true });
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

  const followStats = followStatsQuery.isSuccess ? followStatsQuery.data : null;
  const followerCount = followStats?.followerCount ?? profile?.followerCount ?? 0;
  const followingCount = followStats?.followingCount ?? profile?.followingCount ?? 0;
  const [activeList, setActiveList] = useState<FollowListType | null>(null);

  const followActions = useFollowActions({
    userId: profile?.user.userId ?? '',
    followStatus: profile?.followStatus ?? 'NONE',
    invalidateKeys: [
      { queryKey: ['user', userId] },
      { queryKey: ['feed'] },
      ...(targetUserId
        ? [
            { queryKey: ['followStats', targetUserId] },
            { queryKey: ['follow-list', 'followers', targetUserId] },
            { queryKey: ['follow-list', 'followings', targetUserId] },
          ]
        : []),
    ],
  });

  const followLabel = useMemo(() => followActions.buttonLabel, [followActions.buttonLabel]);

  const openList = (listType: FollowListType) => setActiveList(listType);
  const closeList = () => setActiveList(null);

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

  const initial = profile.user.nickname?.charAt(0) ?? profile.user.userId.charAt(0);

  return (
    <div className="profile-container">
      <button type="button" className="btn btn--secondary" onClick={() => navigate(-1)}>
        뒤로가기
      </button>
      <div className="profile-header">
        <div className="profile-avatar">
          {profile.user.profileImageUrl ? (
            <img src={profile.user.profileImageUrl} alt={profile.user.nickname} />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div>
          <h2>{profile.user.nickname}</h2>
          <p className="profile-username">@{profile.user.userId}</p>
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
        {followLabel ? (
          <button
            type="button"
            className={`btn ${followActions.followStatus === 'APPROVED' ? 'btn--secondary' : 'btn--primary'}`}
            onClick={followActions.toggleFollow}
            disabled={followActions.isProcessing}
          >
            {followActions.isProcessing ? '처리 중...' : followLabel}
          </button>
        ) : null}
      </div>

      <div className="profile-section">
        <h3>소개</h3>
        <p>{profile.bio || '자기소개가 없습니다.'}</p>
      </div>

      <FollowListModal
        userId={profile.user.userId}
        type={activeList ?? 'followers'}
        isOpen={Boolean(activeList)}
        onClose={closeList}
      />
    </div>
  );
};

export default UserProfilePage;
