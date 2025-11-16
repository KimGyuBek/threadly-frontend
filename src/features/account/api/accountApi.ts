import { threadlyApi } from '@/api/http';
import { unwrapThreadlyResponse } from '@/utils/api';

interface VerifyPasswordResponse {
  verifyToken?: string;
  verify_token?: string;
}

export const verifyPassword = async (password: string): Promise<string> => {
  const response = await threadlyApi.post('/api/auth/verify-password', {
    password,
  });
  const data = unwrapThreadlyResponse<VerifyPasswordResponse | undefined>(response.data) ?? {};
  const verifyToken = data.verifyToken ?? data.verify_token;
  if (!verifyToken) {
    throw new Error('비밀번호 검증 토큰을 발급받지 못했습니다.');
  }
  return verifyToken;
};

export const changeAccountPassword = async (
  newPassword: string,
  verifyToken: string,
): Promise<void> => {
  await threadlyApi.patch(
    '/api/me/account/password',
    { newPassword },
    {
      headers: {
        'X-Verify-Token': `Bearer ${verifyToken}`,
      },
    },
  );
};
