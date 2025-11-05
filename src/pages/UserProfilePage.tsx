import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { fetchUserProfile } from '@/features/profile/api/profileApi';
import { buildErrorMessage } from '@/utils/errorMessage';
import { useFollowActions } from '@/hooks/useFollowActions';

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

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

  const followActions = useFollowActions({
    userId: profile?.user.userId ?? '',
    followStatus: profile?.followStatus ?? 'NONE',
    invalidateKeys: [{ queryKey: ['user', userId] }, { queryKey: ['feed'] }],
  });

  const followLabel = useMemo(() => followActions.buttonLabel, [followActions.buttonLabel]);

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
            <span>{profile.user.nickname?.charAt(0) ?? '?'}</span>
          )}
        </div>
        <div>
          <h2>{profile.user.nickname}</h2>
          <p className="profile-username">@{profile.user.userId}</p>
          {profile.statusMessage ? <p className="profile-status">{profile.statusMessage}</p> : null}
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
    </div>
  );
};

export default UserProfilePage;
