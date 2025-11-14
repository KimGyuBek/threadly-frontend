import { ProfileSettingsMenu } from '@/components/ProfileSettingsMenu';

const ProfileSettingsPage = () => {
  return (
    <div className="profile-setup-container">
      <h2 className="section-title">프로필 설정</h2>
      <p className="profile-setup-description">
        프로필 정보를 수정하거나 계정 관련 설정을 관리할 수 있는 항목을 선택하세요.
      </p>
      <ProfileSettingsMenu />
    </div>
  );
};

export default ProfileSettingsPage;
