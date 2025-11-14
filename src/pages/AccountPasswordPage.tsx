import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'react-toastify';

import { AccountSettingsMenu } from '@/components/AccountSettingsMenu';

const AccountPasswordPage = () => {
  const [isSubmitting, setSubmitting] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      toast.info('비밀번호 변경 기능은 준비 중입니다.');
      setSubmitting(false);
    }, 400);
  };

  return (
    <div className="profile-setup-container">
      <h2 className="section-title">비밀번호 변경</h2>
      <p className="profile-setup-description">
        현재 비밀번호를 검증한 뒤 새 비밀번호로 교체하세요. 보안을 위해 주기적으로 업데이트하는 것이 좋아요.
      </p>

      <AccountSettingsMenu />

      <section className="account-settings-card" style={{ marginTop: '1.5rem' }}>
        <form className="account-password-form" onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="currentPassword">
            현재 비밀번호
          </label>
          <input id="currentPassword" type="password" className="auth-input" placeholder="현재 비밀번호" required />

          <label className="auth-label" htmlFor="newPassword">
            새 비밀번호
          </label>
          <input id="newPassword" type="password" className="auth-input" placeholder="새 비밀번호" required />

          <label className="auth-label" htmlFor="confirmPassword">
            새 비밀번호 확인
          </label>
          <input id="confirmPassword" type="password" className="auth-input" placeholder="새 비밀번호 확인" required />

          <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
            {isSubmitting ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default AccountPasswordPage;
