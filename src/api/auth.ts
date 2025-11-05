import { performLogin, performLogout, authApiClient } from './http';
import type { RegisterPayload } from '@/types/auth';

export const registerUser = async (payload: RegisterPayload) => {
  await authApiClient.post('/api/users', payload);
};

export const login = performLogin;
export const logout = performLogout;
