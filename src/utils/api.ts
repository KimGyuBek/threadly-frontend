import type { ThreadlyResponse } from '@/types/api';

export const unwrapThreadlyResponse = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object') {
    const response = payload as ThreadlyResponse<unknown>;
    if ('data' in response && response.data !== undefined) {
      return response.data as T;
    }
  }
  return payload as T;
};
