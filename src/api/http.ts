import axios, { isAxiosError } from 'axios';
import type { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

import { appConfig } from '@/config/env';
import type { ThreadlyResponse } from '@/types/api';
import type { AuthTokens } from '@/types/auth';
import { getAccessToken, getRefreshToken, useAuthStore } from '@/store/authStore';
import { logError, logRequest, logResponse } from '@/utils/httpLogger';
import { ThreadlyApiError, isThreadlyApiError } from '@/utils/threadlyError';

const RETRY_FLAG = Symbol('retry');

const refreshClient = axios.create({ baseURL: appConfig.apiBaseUrl });

refreshClient.interceptors.request.use((config) => {
  logRequest(config);
  return config;
});

refreshClient.interceptors.response.use(
  (response) => handleThreadlyResponse(response),
  (error) => {
    logError(error);
    return Promise.reject(error);
  },
);

let refreshPromise: Promise<AuthTokens | null> | null = null;

const parseTokenPayload = (payload: unknown): AuthTokens => {
  if (payload && typeof payload === 'object') {
    const data = payload as Record<string, unknown>;
    const accessToken = data['accessToken'] ?? data['access_token'];
    const refreshToken = data['refreshToken'] ?? data['refresh_token'];
    if (typeof accessToken === 'string' && typeof refreshToken === 'string') {
      return { accessToken, refreshToken };
    }
    if (data['data'] && typeof data['data'] === 'object') {
      return parseTokenPayload(data['data']);
    }
  }
  throw new Error('Invalid token response');
};

const refreshTokens = async (): Promise<AuthTokens | null> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  refreshPromise = refreshClient
    .post('/api/auth/reissue', undefined, {
      headers: {
        'X-refresh-token': refreshToken,
      },
    })
    .then((response) => {
      const tokens = parseTokenPayload(response.data as ThreadlyResponse<unknown> | AuthTokens);
      useAuthStore.getState().setTokens(tokens);
      return tokens;
    })
    .catch((error: unknown) => {
      useAuthStore.getState().clearTokens();
      if (isAxiosError(error)) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          return null;
        }
      }
      if (isThreadlyApiError(error)) {
        if (error.code === 'TOKEN_EXPIRED' || error.code === 'UNAUTHORIZED') {
          return null;
        }
      }
      throw normalizeError(error);
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

const shouldSkipAuth = (url?: string): boolean => {
  if (!url) {
    return false;
  }
  return url.includes('/api/auth/login') || url.includes('/api/auth/reissue');
};

const attachAuthHeader = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  if (shouldSkipAuth(config.url)) {
    return config;
  }
  const token = getAccessToken();
  if (token) {
    if (!config.headers) {
      config.headers = {};
    }
    if (typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      (config.headers as Record<string, unknown>).Authorization = `Bearer ${token}`;
    }
  }
  return config;
};

const handleThreadlyResponse = (response: AxiosResponse) => {
  logResponse(response);
  const data = response.data as { success?: boolean; message?: string; code?: string } | undefined;
  if (data && typeof data === 'object' && 'success' in data) {
    if (data.success === false) {
      return Promise.reject(
        new ThreadlyApiError({
          message: data.message ?? '요청이 실패했습니다.',
          code: data.code,
          status: response.status,
          data,
          url: response.config.url ?? undefined,
          method: response.config.method?.toUpperCase(),
        }),
      );
    }
  }
  return response;
};

const normalizeError = (error: unknown) => {
  if (isThreadlyApiError(error)) {
    return error;
  }
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string; code?: string } | undefined;
    if (data && typeof data === 'object' && ('code' in data || 'message' in data)) {
      return new ThreadlyApiError({
        message: data.message ?? error.message ?? '요청이 실패했습니다.',
        code: data.code,
        status: error.response?.status,
        data,
        url: error.config?.url ?? undefined,
        method: error.config?.method?.toUpperCase(),
      });
    }
    if (error.message) {
      return new ThreadlyApiError({
        message: error.message,
        status: error.response?.status,
        url: error.config?.url ?? undefined,
        method: error.config?.method?.toUpperCase(),
        data: error.response?.data,
      });
    }
  }
  return error;
};

const setupInterceptors = (instance: AxiosInstance): void => {
  instance.interceptors.request.use((config) => {
    logRequest(config);
    return attachAuthHeader(config);
  });

  instance.interceptors.response.use(
    (response) => handleThreadlyResponse(response),
    async (error) => {
      logError(error);
      const originalRequest = error.config as InternalAxiosRequestConfig & { [RETRY_FLAG]?: boolean };
      const responseData = error.response?.data as { code?: string } | undefined;
      const shouldRetry =
        !originalRequest?.[RETRY_FLAG] &&
        error.response &&
        (error.response.status === 401 ||
          (error.response.status === 403 && responseData?.code === 'TOKEN_EXPIRED'));

      if (!shouldRetry) {
        return Promise.reject(normalizeError(error));
      }

      originalRequest[RETRY_FLAG] = true;

      try {
        const tokens = await refreshTokens();
        if (!tokens) {
          return Promise.reject(normalizeError(error));
        }

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return instance(originalRequest as AxiosRequestConfig);
      } catch (refreshError) {
        return Promise.reject(normalizeError(refreshError));
      }
    },
  );
};

export const threadlyApi = axios.create({
  baseURL: appConfig.apiBaseUrl,
  withCredentials: false,
});

export const notificationApi = axios.create({
  baseURL: appConfig.notificationApiBaseUrl,
  withCredentials: false,
});

setupInterceptors(threadlyApi);
setupInterceptors(notificationApi);

export const authApiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  withCredentials: false,
});

authApiClient.interceptors.request.use((config) => {
  logRequest(config);
  if (!shouldSkipAuth(config.url)) {
    attachAuthHeader(config);
  }
  return config;
});

authApiClient.interceptors.response.use(
  (response) => handleThreadlyResponse(response),
  (error) => {
    logError(error);
    return Promise.reject(normalizeError(error));
  },
);

export const performLogin = async (email: string, password: string): Promise<AuthTokens> => {
  const response = await authApiClient.post('/api/auth/login', { email, password });
  const tokens = parseTokenPayload(response.data as ThreadlyResponse<unknown> | AuthTokens);
  useAuthStore.getState().setTokens(tokens);
  return tokens;
};

export const performLogout = async (): Promise<void> => {
  try {
    await threadlyApi.post('/api/auth/logout');
  } catch (error) {
    // ignore logout errors
    console.warn('Logout request failed', error);
  } finally {
    useAuthStore.getState().clearTokens();
  }
};

export const ensureFreshAccessToken = async (): Promise<string | null> => {
  const token = getAccessToken();
  if (token) {
    return token;
  }
  const tokens = await refreshTokens();
  return tokens?.accessToken ?? null;
};
