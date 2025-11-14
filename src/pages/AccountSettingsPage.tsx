import { AccountSettingsMenu } from '@/components/AccountSettingsMenu';

const AccountSettingsPage = () => {
  return (
    <div className="profile-setup-container">
      <h2 className="section-title">계정 설정</h2>
      <p className="profile-setup-description">
        비밀번호, 계정 상태, 공개 범위를 포함해 Threadly 계정을 안전하게 관리하세요.
      </p>
      <AccountSettingsMenu />
    </div>
  );
};

export default AccountSettingsPage;
