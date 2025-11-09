const DEFAULT_PROFILE_IMAGE_URL = new URL('../../default_profileimage.svg', import.meta.url).href;

const INVALID_PROFILE_IMAGE_VALUES = new Set(['', '/', './', 'default']);

export const normalizeProfileImageUrl = (url?: string | null): string | undefined => {
  if (!url) {
    return undefined;
  }
  const trimmed = url.trim();
  const normalized = trimmed.toLowerCase();
  if (!trimmed || INVALID_PROFILE_IMAGE_VALUES.has(normalized)) {
    return undefined;
  }
  return trimmed;
};

export const hasCustomProfileImage = (url?: string | null): url is string => {
  return Boolean(normalizeProfileImageUrl(url));
};

export const getProfileImageUrl = (url?: string | null): string => {
  return normalizeProfileImageUrl(url) ?? DEFAULT_PROFILE_IMAGE_URL;
};

export const isDefaultProfileImageUrl = (url?: string | null): boolean => !normalizeProfileImageUrl(url);
