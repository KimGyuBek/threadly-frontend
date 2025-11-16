import { toast } from 'react-toastify';


const AccountDeletionPage = () => {
  const handleDeleteRequest = () => {
    toast.warn('계정 탈퇴 요청 기능은 준비 중입니다.');
  };

  return (
    <div className="profile-setup-container">
      <h2 className="section-title">계정 탈퇴</h2>
      <p className="profile-setup-description">
        계정을 삭제하면 모든 게시글과 활동 기록이 7일 후 영구 삭제됩니다. 탈퇴 전에 데이터를 백업해 두는 것이 좋습니다.
      </p>
      <section className="account-settings-card" style={{ marginTop: '1.5rem' }}>
        <p>
          탈퇴 요청 후 7일간은 재로그인으로 요청을 취소할 수 있습니다. 이 기간이 지나면 계정과 데이터는 복구할 수 없습니다.
        </p>
        <button type="button" className="btn btn--secondary" onClick={handleDeleteRequest}>
          계정 탈퇴 요청
        </button>
      </section>
    </div>
  );
};

export default AccountDeletionPage;
