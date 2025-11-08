import { appConfig } from '@/config/env';

const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+\-.]*:\/\//i;
const DATA_URL_PATTERN = /^data:/i;
const PROTOCOL_RELATIVE_PATTERN = /^\/\//;
const INVALID_PATH_VALUES = new Set(['', '/', './']);

const getBaseOrigin = (): string => {
  const base = appConfig.apiBaseUrl ?? '';
  if (!base) {
    return '';
  }
  try {
    const parsed = new URL(base);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return base.replace(/\/$/, '');
  }
};

const baseOrigin = getBaseOrigin();

export const resolveMediaUrl = (rawUrl?: string | null): string | undefined => {
  if (!rawUrl) {
    return undefined;
  }
  const trimmed = rawUrl.trim();
  if (!trimmed || INVALID_PATH_VALUES.has(trimmed)) {
    return undefined;
  }
  if (ABSOLUTE_URL_PATTERN.test(trimmed) || DATA_URL_PATTERN.test(trimmed)) {
    return trimmed;
  }
  if (PROTOCOL_RELATIVE_PATTERN.test(trimmed)) {
    if (!baseOrigin) {
      return `https:${trimmed}`;
    }
    const protocol = baseOrigin.split(':')[0] || 'https';
    return `${protocol}:${trimmed}`;
  }

  const normalizedBase = baseOrigin || appConfig.apiBaseUrl.replace(/\/$/, '');
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${normalizedBase}${normalizedPath}`;
};
