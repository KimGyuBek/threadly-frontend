import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { login, registerUser } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import { buildErrorMessage } from '@/utils/errorMessage';
import { decodeJwt } from '@/utils/jwt';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const tokens = useAuthStore((state) => state.tokens);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectPath = useMemo(() => {
    const state = location.state as { from?: { pathname?: string } } | undefined;
    return state?.from?.pathname ?? '/';
  }, [location.state]);

  useEffect(() => {
    if (tokens) {
      navigate(redirectPath, { replace: true });
    }
  }, [tokens, navigate, redirectPath]);

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
        email: email.trim(),
        password,
        phone: phone.trim(),
      }),
    onSuccess: () => {
      toast.success('회원가입이 완료되었습니다. 인증메일을 확인해주세요.');
      setMode('login');
      setPassword('');
      setErrorMessage(null);
    },
    onError: (error: unknown) => {
      setErrorMessage(buildErrorMessage(error, '회원가입에 실패했습니다.'));
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (mode === 'login') {
      if (!email || !password) {
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
    if (!email || !password) {
      setErrorMessage('이메일과 비밀번호를 모두 입력하세요.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('연락처를 입력하세요.');
      return;
    }

    signupMutation.mutate();
  };

  const isSubmitting = loginMutation.isPending || signupMutation.isPending;

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

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
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
