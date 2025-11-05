import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { AuthTokens } from '@/types/auth';

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
      name: 'threadly-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const getAccessToken = (): string | null => useAuthStore.getState().tokens?.accessToken ?? null;

export const getRefreshToken = (): string | null =>
  useAuthStore.getState().tokens?.refreshToken ?? null;
