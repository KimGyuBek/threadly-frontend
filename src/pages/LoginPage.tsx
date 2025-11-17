import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { login, registerUser } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import { buildErrorMessage } from '@/utils/errorMessage';
import { decodeJwt } from '@/utils/jwt';

const emailDomainOptions = [
  { label: 'naver.com', value: 'naver.com' },
  { label: 'gmail.com', value: 'gmail.com' },
  { label: 'hanmail.net', value: 'hanmail.net' },
  { label: 'kakao.com', value: 'kakao.com' },
  { label: '직접 입력', value: 'custom' },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const tokens = useAuthStore((state) => state.tokens);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [phone, setPhone] = useState('');
  const [signupEmailLocal, setSignupEmailLocal] = useState('');
  const [signupEmailDomainOption, setSignupEmailDomainOption] = useState(emailDomainOptions[0].value);
  const [signupEmailDomainCustom, setSignupEmailDomainCustom] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDomainMenuOpen, setDomainMenuOpen] = useState(false);
  const domainMenuRef = useRef<HTMLDivElement | null>(null);

  const redirectPath = useMemo(() => {
    const state = location.state as { from?: { pathname?: string } } | undefined;
    return state?.from?.pathname ?? '/';
  }, [location.state]);

  const selectedEmailDomain = useMemo(() => {
    if (signupEmailDomainOption === 'custom') {
      return signupEmailDomainCustom.trim();
    }
    return signupEmailDomainOption;
  }, [signupEmailDomainCustom, signupEmailDomainOption]);

  const composedSignupEmail = useMemo(() => {
    const local = signupEmailLocal.trim();
    if (!local || !selectedEmailDomain) {
      return '';
    }
    return `${local}@${selectedEmailDomain}`;
  }, [selectedEmailDomain, signupEmailLocal]);

  const selectedDomainLabel = useMemo(() => {
    if (signupEmailDomainOption === 'custom') {
      return signupEmailDomainCustom.trim() || '직접 입력';
    }
    const preset = emailDomainOptions.find((option) => option.value === signupEmailDomainOption);
    return preset?.label ?? signupEmailDomainOption;
  }, [signupEmailDomainCustom, signupEmailDomainOption]);

  useEffect(() => {
    if (tokens) {
      navigate(redirectPath, { replace: true });
    }
  }, [tokens, navigate, redirectPath]);

  useEffect(() => {
    if (mode !== 'signup') {
      return;
    }
    setEmail(composedSignupEmail);
  }, [composedSignupEmail, mode]);

  useEffect(() => {
    if (mode !== 'signup') {
      setDomainMenuOpen(false);
    }
  }, [mode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!domainMenuRef.current) {
        return;
      }
      if (!domainMenuRef.current.contains(event.target as Node)) {
        setDomainMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loginMutation = useMutation({
    mutationFn: () => login(email.trim(), password),
    onSuccess: (tokens) => {
      setErrorMessage(null);
      const payload = decodeJwt(tokens.accessToken);
      if (payload?.userStatusType === 'INCOMPLETE_PROFILE') {
        navigate('/profile/setup', { replace: true });
        return;
      }
      navigate(redirectPath, { replace: true });
    },
    onError: (error: unknown) => {
      setErrorMessage(buildErrorMessage(error, '로그인에 실패했습니다.'));
    },
  });

  const signupMutation = useMutation({
    mutationFn: () =>
      registerUser({
        userName: userName.trim(),
        email: composedSignupEmail.trim(),
        password,
        phone: phone.trim(),
      }),
    onSuccess: () => {
      toast.success('회원가입이 완료되었습니다. 인증메일을 확인해주세요.');
      setMode('login');
      setPassword('');
      setConfirmPassword('');
      setConfirmPasswordError(null);
      setEmailError(null);
      setErrorMessage(null);
    },
    onError: (error: unknown) => {
      setErrorMessage(buildErrorMessage(error, '회원가입에 실패했습니다.'));
    },
  });

  const handleSelectEmailDomain = (value: string) => {
    setSignupEmailDomainOption(value);
    if (value !== 'custom') {
      setSignupEmailDomainCustom('');
    }
    setDomainMenuOpen(false);
    setEmailError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setEmailError(null);

    if (mode === 'login') {
      if (!email.trim() || !password) {
        setErrorMessage('이메일과 비밀번호를 모두 입력하세요.');
        return;
      }
      loginMutation.mutate();
      return;
    }

    if (!userName.trim()) {
      setErrorMessage('이름(닉네임)을 입력하세요.');
      return;
    }
    if (!password) {
      setErrorMessage('비밀번호를 입력하세요.');
      return;
    }
    if (!signupEmailLocal.trim()) {
      setEmailError('이메일 아이디를 입력하세요.');
      return;
    }
    if (!selectedEmailDomain) {
      setEmailError('이메일 도메인을 선택하거나 입력하세요.');
      return;
    }
    if (!emailPattern.test(composedSignupEmail)) {
      setEmailError('올바른 이메일 형식이 아닙니다.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('연락처를 입력하세요.');
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('비밀번호가 일치하지 않습니다.');
      return;
    }
    setConfirmPasswordError(null);

    signupMutation.mutate();
  };

  const isSubmitting = loginMutation.isPending || signupMutation.isPending;
  const trimmedLoginEmail = email.trim();
  const trimmedUserName = userName.trim();
  const trimmedPhone = phone.trim();
  const isSignupFormValid =
    mode === 'signup' &&
    Boolean(
      trimmedUserName &&
      composedSignupEmail &&
      password &&
      trimmedPhone &&
      confirmPassword &&
      password === confirmPassword &&
      emailPattern.test(composedSignupEmail) &&
      !emailError,
    );

  useEffect(() => {
    if (mode !== 'signup') {
      return;
    }
    if (!signupEmailLocal.trim()) {
      setEmailError(null);
      return;
    }
    if (!selectedEmailDomain) {
      setEmailError('이메일 도메인을 선택하거나 입력하세요.');
      return;
    }
    if (!emailPattern.test(composedSignupEmail)) {
      setEmailError('올바른 이메일 형식이 아닙니다.');
    } else {
      setEmailError(null);
    }
  }, [composedSignupEmail, mode, selectedEmailDomain, signupEmailLocal]);

  useEffect(() => {
    if (mode !== 'signup') {
      return;
    }
    if (!confirmPassword) {
      setConfirmPasswordError(null);
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('비밀번호가 일치하지 않습니다.');
    } else {
      setConfirmPasswordError(null);
    }
  }, [confirmPassword, mode, password]);

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'auth-tab--active' : ''}`}
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
              setConfirmPassword('');
              setConfirmPasswordError(null);
              setEmailError(null);
            }}
          >
            로그인
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'signup' ? 'auth-tab--active' : ''}`}
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
              setConfirmPassword('');
              setConfirmPasswordError(null);
              setEmailError(null);
            }}
          >
            회원가입
          </button>
        </div>

        <h1 className="auth-title">Threadly {mode === 'login' ? '로그인' : '회원가입'}</h1>
        <p className="auth-subtitle">
          {mode === 'login'
            ? '계정으로 로그인해 알림을 확인하세요.'
            : '새 계정을 생성하고 Threadly를 시작하세요.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' ? (
            <>
              <label className="auth-label" htmlFor="userName">
                이름 / 닉네임
              </label>
              <input
                id="userName"
                name="userName"
                type="text"
                value={userName}
                onChange={(event) => setUserName(event.target.value)}
                className="auth-input"
                placeholder="Threadly"
                disabled={isSubmitting}
                required
              />
            </>
          ) : null}

          {mode === 'login' ? (
            <>
              <label className="auth-label" htmlFor="email">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="auth-input"
                placeholder="user@example.com"
                disabled={isSubmitting}
                required
              />
            </>
          ) : (
            <>
              <label className="auth-label" htmlFor="signupEmailLocal">
                이메일
              </label>
              <div className="auth-email-group">
                <input
                  id="signupEmailLocal"
                  name="signupEmailLocal"
                  type="text"
                  value={signupEmailLocal}
                  onChange={(event) => {
                    setSignupEmailLocal(event.target.value);
                    setEmailError(null);
                  }}
                  className={`auth-input auth-email-group__local ${emailError ? 'auth-input--error' : ''}`}
                  placeholder="example"
                  disabled={isSubmitting}
                  required
                />
                <span className="auth-email-group__at">@</span>
                <div className="auth-email-domain" ref={domainMenuRef}>
                  <button
                    type="button"
                    className={`auth-email-domain__trigger auth-input ${emailError ? 'auth-input--error' : ''}`}
                    onClick={() => {
                      if (isSubmitting) {
                        return;
                      }
                      setDomainMenuOpen((prev) => !prev);
                    }}
                    disabled={isSubmitting}
                    aria-haspopup="listbox"
                    aria-expanded={isDomainMenuOpen}
                  >
                    <span>{selectedDomainLabel}</span>
                    <span className="auth-email-domain__chevron" aria-hidden>
                      ▾
                    </span>
                  </button>
                  {isDomainMenuOpen ? (
                    <ul className="auth-email-domain__menu" role="listbox">
                      {emailDomainOptions.map((option) => (
                        <li key={option.value}>
                          <button
                            type="button"
                            className="auth-email-domain__option"
                            onClick={() => handleSelectEmailDomain(option.value)}
                          >
                            {option.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
              {signupEmailDomainOption === 'custom' ? (
                <input
                  id="signupEmailDomainCustom"
                  name="signupEmailDomainCustom"
                  type="text"
                  value={signupEmailDomainCustom}
                  onChange={(event) => {
                    setSignupEmailDomainCustom(event.target.value);
                    setEmailError(null);
                  }}
                  className={`auth-input auth-email-custom-input ${emailError ? 'auth-input--error' : ''}`}
                  placeholder="domain.com"
                  disabled={isSubmitting}
                  required
                />
              ) : null}
              {emailError ? <p className="auth-field-error">{emailError}</p> : null}
            </>
          )}

          <label className="auth-label" htmlFor="password">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="auth-input"
            placeholder={mode === 'login' ? '비밀번호' : '8자 이상 입력'}
            disabled={isSubmitting}
            required
          />

          {mode === 'signup' ? (
            <>
              <label className="auth-label" htmlFor="confirmPassword">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => {
                  const value = event.target.value;
                  setConfirmPassword(value);
                  if (!value) {
                    setConfirmPasswordError(null);
                    return;
                  }
                  if (password && value !== password) {
                    setConfirmPasswordError('비밀번호가 일치하지 않습니다.');
                  } else {
                    setConfirmPasswordError(null);
                  }
                }}
                className={`auth-input ${confirmPasswordError ? 'auth-input--error' : ''}`}
                placeholder="비밀번호를 다시 입력하세요"
                disabled={isSubmitting}
                required
              />
              {confirmPasswordError ? <p className="auth-field-error">{confirmPasswordError}</p> : null}
            </>
          ) : null}

          {mode === 'signup' ? (
            <>
              <label className="auth-label" htmlFor="phone">
                연락처
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="auth-input"
                placeholder="010-1234-5678"
                disabled={isSubmitting}
                required
              />
            </>
          ) : null}

          {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

          <button
            type="submit"
            className="auth-submit"
            disabled={
              isSubmitting || (mode === 'signup' ? !isSignupFormValid : !trimmedLoginEmail || !password)
            }
          >
            {mode === 'login'
              ? loginMutation.isPending
                ? '로그인 중...'
                : '로그인'
              : signupMutation.isPending
                ? '회원가입 중...'
                : '회원가입'}
          </button>

          {mode === 'login' ? (
            <p className="auth-helper">
              계정이 없으신가요?{' '}
              <button
                type="button"
                className="auth-helper__link"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                  setConfirmPassword('');
                  setConfirmPasswordError(null);
                  setEmailError(null);
                }}
              >
                회원가입
              </button>
            </p>
          ) : (
            <p className="auth-helper">
              이미 계정이 있으신가요?{' '}
              <button
                type="button"
                className="auth-helper__link"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setConfirmPassword('');
                  setConfirmPasswordError(null);
                  setEmailError(null);
                }}
              >
                로그인
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
