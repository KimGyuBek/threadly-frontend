import { isAxiosError } from 'axios';

import { isThreadlyApiError } from './threadlyError';

const NETWORK_ERROR_SIGNATURES = ['ERR_CONNECTION_REFUSED', 'ERR_CONNECTION_TIMED_OUT', 'NETWORK ERROR'];

const normalizeMessage = (message?: string | null): string => message?.toUpperCase() ?? '';

const hasNetworkSignature = (message?: string | null): boolean => {
  if (!message) {
    return false;
  }
  const normalized = normalizeMessage(message);
  return NETWORK_ERROR_SIGNATURES.some((signature) => normalized.includes(signature));
};

export const NETWORK_UNAVAILABLE_MESSAGE = '서버 응답이 없습니다. 다시 시도해주세요.';

export const isNetworkUnavailableError = (error: unknown): boolean => {
  if (!error) {
    return false;
  }

  if (isThreadlyApiError(error)) {
    return hasNetworkSignature(error.message);
  }

  if (isAxiosError(error)) {
    if (error.code === 'ERR_NETWORK') {
      return true;
    }
    if (hasNetworkSignature(error.message)) {
      return true;
    }
    const causeMessage =
      typeof error.cause === 'object' && error.cause && 'message' in error.cause
        ? String((error.cause as { message?: string }).message ?? '')
        : undefined;
    if (hasNetworkSignature(causeMessage)) {
      return true;
    }
  }

  if (error instanceof Error) {
    return hasNetworkSignature(error.message);
  }

  if (typeof error === 'string') {
    return hasNetworkSignature(error);
  }

  return false;
};
