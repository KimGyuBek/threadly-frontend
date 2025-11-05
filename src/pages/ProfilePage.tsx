import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import { fetchMyProfile } from '@/features/profile/api/profileApi';
import { buildErrorMessage } from '@/utils/errorMessage';

const ProfilePage = () => {
  const profileQuery = useQuery({
    queryKey: ['me', 'profile'],
    queryFn: fetchMyProfile,
    retry: (count, error) => {
      const message = buildErrorMessage(error, '프로필 정보를 불러오지 못했습니다.');
      if (count === 1) {
        toast.error(message);
      }
      return count < 2;
    },
  });

  if (profileQuery.isLoading) {
    return <div className="profile-container">프로필을 불러오는 중...</div>;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return <div className="profile-container">프로필 정보를 불러오지 못했습니다.</div>;
  }

  const profile = profileQuery.data;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar">
          {profile.profileImageUrl ? (
            <img src={profile.profileImageUrl} alt={profile.nickname} />
          ) : (
            <span>{profile.nickname?.charAt(0) ?? '?'}</span>
          )}
        </div>
        <div>
          <h2>{profile.nickname}</h2>
          <p className="profile-username">@{profile.userId}</p>
          {profile.statusMessage ? <p className="profile-status">{profile.statusMessage}</p> : null}
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

export default ProfilePage;
