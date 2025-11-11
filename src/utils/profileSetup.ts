import { isAxiosError } from 'axios';

import { isThreadlyApiError } from '@/utils/threadlyError';

const PROFILE_SETUP_ERROR_CODES = new Set([
  'USER_PROFILE_NOT_SET',
  'USER_PROFILE_NOT_EXISTS',
  'USER_PROFILE_NOT_FOUND',
]);

const hasProfileSetupErrorCode = (code?: string): boolean => {
  if (!code) {
    return false;
  }
  return PROFILE_SETUP_ERROR_CODES.has(code.toUpperCase());
};

const isProfileSetupEndpoint = (url?: string): boolean => {
  if (!url) {
    return false;
  }
  return url.includes('/api/me/profile');
};

export const isProfileSetupRequiredError = (error: unknown): boolean => {
  if (isThreadlyApiError(error)) {
    if (hasProfileSetupErrorCode(error.code)) {
      return true;
    }
    const nestedCode = (error.data as { code?: string } | undefined)?.code;
    if (hasProfileSetupErrorCode(nestedCode)) {
      return true;
    }
    if (!error.code && error.status === 404 && isProfileSetupEndpoint(error.url)) {
      return true;
    }
  }

  if (isAxiosError(error)) {
    const payload = error.response?.data as { code?: string } | undefined;
    if (hasProfileSetupErrorCode(payload?.code)) {
      return true;
    }
    if (!payload?.code && error.response?.status === 404 && isProfileSetupEndpoint(error.config?.url)) {
      return true;
    }
  }

  return false;
};

export const redirectToProfileSetupPage = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  if (window.location.pathname.includes('/profile/setup')) {
    return;
  }
  window.location.replace('/profile/setup');
};
