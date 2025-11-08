import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { AuthTokens } from '@/types/auth';

const AUTH_STORAGE_KEY = 'threadly-auth';

const readPersistedTokens = (): AuthTokens | null => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { state?: { tokens?: AuthTokens | null } } | null;
    const tokens = parsed?.state?.tokens;
    if (tokens && typeof tokens.accessToken === 'string' && typeof tokens.refreshToken === 'string') {
      return tokens;
    }
  } catch (error) {
    console.warn('Failed to read persisted auth tokens', error);
  }
  return null;
};

const resolveTokens = (): AuthTokens | null => {
  const stateTokens = useAuthStore.getState().tokens;
  if (stateTokens) {
    return stateTokens;
  }
  return readPersistedTokens();
};

interface AuthState {
  tokens: AuthTokens | null;
  setTokens: (tokens: AuthTokens) => void;
  clearTokens: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      tokens: null,
      setTokens: (tokens) => set({ tokens }),
      clearTokens: () => set({ tokens: null }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const getAccessToken = (): string | null => resolveTokens()?.accessToken ?? null;

export const getRefreshToken = (): string | null => resolveTokens()?.refreshToken ?? null;
