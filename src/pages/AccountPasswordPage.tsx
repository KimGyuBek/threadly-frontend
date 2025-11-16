import { useCallback, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { toast } from 'react-toastify';

import { changeAccountPassword, verifyPassword } from '@/features/account/api/accountApi';
import { buildErrorMessage } from '@/utils/errorMessage';
import { isThreadlyApiError } from '@/utils/threadlyError';

const MIN_PASSWORD_LENGTH = 8;

interface VerificationState {
  token: string;
}

const AccountPasswordPage = () => {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [verification, setVerification] = useState<VerificationState | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);

  const resetVerification = useCallback(() => {
    setVerification(null);
  }, []);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'currentPassword') {
      resetVerification();
      setVerificationError(null);
    }
  };

  const requestVerification = useCallback(async (): Promise<string> => {
    if (!form.currentPassword.trim()) {
      throw new Error('현재 비밀번호를 입력해주세요.');
    }
    const token = await verifyPassword(form.currentPassword.trim());
    setVerification({ token });
    setVerificationError(null);
    return token;
  }, [form.currentPassword]);

  const handleVerifyPassword = async () => {
    try {
      setIsVerifying(true);
      await requestVerification();
      toast.success('비밀번호가 확인되었습니다.');
    } catch (error) {
      const message = buildErrorMessage(error, '비밀번호 확인에 실패했습니다.');
      resetVerification();
      setVerificationError(message);
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    if (!form.newPassword || !form.confirmPassword) {
      toast.error('새 비밀번호를 입력해주세요.');
      return;
    }
    if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(`새 비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      setSubmitting(true);
      let verifyToken = verification?.token;
      if (!verifyToken) {
        verifyToken = await requestVerification();
        toast.info('비밀번호가 확인되었습니다. 새 비밀번호를 저장합니다.');
      }

      await changeAccountPassword(form.newPassword.trim(), verifyToken);
      toast.success('비밀번호를 변경했습니다.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      resetVerification();
      setVerificationError(null);
    } catch (error) {
      const message = buildErrorMessage(error, '비밀번호 변경에 실패했습니다.');
      toast.error(message);
      if (
        isThreadlyApiError(error) &&
        error.code &&
        (error.code === 'SECOND_VERIFICATION_FAILED' || error.code === 'TOKEN_EXPIRED')
      ) {
        resetVerification();
        setVerificationError('비밀번호 확인이 만료되었습니다. 다시 인증해주세요.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="profile-setup-container">
      <h2 className="section-title">비밀번호 변경</h2>
      <p className="profile-setup-description">
        현재 비밀번호를 검증한 뒤 새 비밀번호로 교체하세요. 보안을 위해 주기적으로 업데이트하는 것이 좋아요.
      </p>
      <section className="account-settings-card" style={{ marginTop: '1.5rem' }}>
        <form className="account-password-form" onSubmit={handleSubmit}>
          <div className="account-password-form__verify-row">
            <div className="account-password-form__field">
              <label className="auth-label" htmlFor="currentPassword">
                현재 비밀번호
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                className="auth-input"
                placeholder="현재 비밀번호"
                value={form.currentPassword}
                onChange={handleChange}
                required
              />
            </div>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleVerifyPassword}
              disabled={isVerifying || !form.currentPassword.trim()}
            >
              {isVerifying ? '확인 중...' : '비밀번호 확인'}
            </button>
          </div>
          {verification && !verificationError ? (
            <p className="account-password-form__hint account-password-form__hint--success">
              비밀번호가 확인되었습니다. 짧은 시간 동안만 유효하므로 바로 변경을 완료하세요.
            </p>
          ) : null}
          {verificationError ? (
            <p className="account-password-form__hint account-password-form__hint--error">{verificationError}</p>
          ) : null}

          <label className="auth-label" htmlFor="newPassword">
            새 비밀번호
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            className="auth-input"
            placeholder="새 비밀번호"
            value={form.newPassword}
            onChange={handleChange}
            required
          />

          <label className="auth-label" htmlFor="confirmPassword">
            새 비밀번호 확인
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            className="auth-input"
            placeholder="새 비밀번호 확인"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />

          <button type="submit" className="btn btn--primary" disabled={isSubmitting || isVerifying}>
            {isSubmitting ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default AccountPasswordPage;
