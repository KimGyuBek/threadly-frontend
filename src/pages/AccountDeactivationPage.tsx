import { toast } from 'react-toastify';


const AccountDeactivationPage = () => {
  const handleDeactivate = () => {
    toast.info('계정 비활성화 기능은 준비 중입니다.');
  };

  const handleReactivateInfo = () => {
    toast.info('비활성화된 계정은 언제든지 다시 로그인하면 복구됩니다.');
  };

  return (
    <div className="profile-setup-container">
      <h2 className="section-title">계정 비활성화</h2>
      <p className="profile-setup-description">
        계정을 잠시 쉬게 하고 싶을 때 비활성화하세요. 계정과 데이터는 유지되며, 다시 로그인하면 즉시 복구됩니다.
      </p>
      <section className="account-settings-card" style={{ marginTop: '1.5rem' }}>
        <ul className="account-settings-list">
          <li>프로필과 게시글은 다른 사용자에게 숨겨집니다.</li>
          <li>팔로워와 알림은 유지되며, 비활성화 중에는 아무도 당신에게 메시지를 보낼 수 없습니다.</li>
          <li>다시 로그인하면 자동으로 재활성화됩니다.</li>
        </ul>
        <div className="account-settings-card__actions">
          <button type="button" className="btn" onClick={handleReactivateInfo}>
            복구 안내
          </button>
          <button type="button" className="btn btn--secondary" onClick={handleDeactivate}>
            계정 비활성화
          </button>
        </div>
      </section>
    </div>
  );
};

export default AccountDeactivationPage;
