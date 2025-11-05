import type { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const redactKeys = ['password', 'token', 'accessToken', 'refreshToken'];

const normalizeHeaders = (headers: unknown): Record<string, unknown> => {
  if (!headers) {
    return {};
  }
  if (typeof headers === 'object' && headers !== null) {
    const maybeHeaders = headers as { toJSON?: () => Record<string, unknown> };
    if (typeof maybeHeaders.toJSON === 'function') {
      try {
        return maybeHeaders.toJSON();
      } catch (error) {
        console.warn('Failed to convert headers via toJSON', error);
      }
    }
    if (headers instanceof Headers) {
      const result: Record<string, string> = {};
      headers.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }
    return { ...(headers as Record<string, unknown>) };
  }
  return {};
};

const sanitize = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  const record = value as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};
  Object.keys(record).forEach((key) => {
    if (redactKeys.some((redactKey) => key.toLowerCase().includes(redactKey.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitize(record[key]);
    }
  });
  return sanitized;
};

export const logRequest = (config: InternalAxiosRequestConfig) => {
  const { method, baseURL, url, params, data } = config;
  let parsedData: unknown = data;
  if (typeof parsedData === 'string') {
    try {
      parsedData = JSON.parse(parsedData);
    } catch (_) {
      // keep as string if not JSON
    }
  }
  const target = `${baseURL ?? ''}${url ?? ''}`;
  console.info('[HTTP] Request', {
    method: method?.toUpperCase(),
    url: target,
    params,
    body: sanitize(parsedData ?? {}),
    headers: sanitize(normalizeHeaders(config.headers)),
  });
};

export const logResponse = (response: AxiosResponse) => {
  const { status, config, data } = response;
  const target = `${config.baseURL ?? ''}${config.url ?? ''}`;
  console.info('[HTTP] Response', {
    method: config.method?.toUpperCase(),
    url: target,
    status,
    body: sanitize(data),
    headers: sanitize(normalizeHeaders(response.headers)),
  });
};

export const logError = (error: AxiosError) => {
  const { config, response, message } = error;
  const target = `${config?.baseURL ?? ''}${config?.url ?? ''}`;
  console.error('[HTTP] Error', {
    method: config?.method?.toUpperCase(),
    url: target,
    status: response?.status,
    message,
    body: sanitize(response?.data),
    headers: sanitize(normalizeHeaders(config?.headers)),
  });
};
