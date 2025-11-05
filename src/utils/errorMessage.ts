import { isAxiosError } from 'axios';

import { isThreadlyApiError } from './threadlyError';

export const buildErrorMessage = (error: unknown, fallback: string): string => {
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
