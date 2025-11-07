const { VITE_API_BASE_URL, VITE_NOTIFICATION_API_BASE_URL, VITE_NOTIFICATION_WS_URL } =
  import.meta.env;

const resolveBaseUrl = (rawUrl: string | undefined, fallback: string) => {
  return (rawUrl && rawUrl.length > 0 ? rawUrl : fallback).replace(/\/$/, '');
};

const apiBase = resolveBaseUrl(VITE_API_BASE_URL as string | undefined, 'https://api.threadly.kr');
const notificationApiBase = resolveBaseUrl(
  VITE_NOTIFICATION_API_BASE_URL as string | undefined,
  apiBase,
);

const deriveWebSocketUrl = () => {
  if (VITE_NOTIFICATION_WS_URL && typeof VITE_NOTIFICATION_WS_URL === 'string') {
    return VITE_NOTIFICATION_WS_URL;
  }
  try {
    const baseUrl = new URL(notificationApiBase);
    return `ws://${baseUrl.host}/ws/notifications`;
  } catch {
    const sanitized = notificationApiBase.replace(/^https?:\/\//, '');
    return `ws://${sanitized}/ws/notifications`;
  }
};

export const appConfig = {
  apiBaseUrl: apiBase,
  notificationApiBaseUrl: notificationApiBase,
  notificationWebSocketUrl: deriveWebSocketUrl(),
};
