import { isAxiosError } from 'axios';

import { isNetworkUnavailableError, NETWORK_UNAVAILABLE_MESSAGE } from './networkError';
import { isThreadlyApiError } from './threadlyError';

export const buildErrorMessage = (error: unknown, fallback: string): string => {
  if (isNetworkUnavailableError(error)) {
    return NETWORK_UNAVAILABLE_MESSAGE;
  }
  if (isThreadlyApiError(error)) {
    return error.code ? `${error.message} (${error.code})` : error.message;
  }
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string; code?: string } | undefined;
    if (data?.message) {
      return data.code ? `${data.message} (${data.code})` : data.message;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};
