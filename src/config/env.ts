const { VITE_API_BASE_URL, VITE_NOTIFICATION_API_BASE_URL, VITE_NOTIFICATION_WS_URL } =
  import.meta.env;

export const appConfig = {
  apiBaseUrl: (VITE_API_BASE_URL as string | undefined) ?? 'https://api.threadly.kr',
  notificationApiBaseUrl:
    (VITE_NOTIFICATION_API_BASE_URL as string | undefined) ?? 'https://api.threadly.kr',
  notificationWebSocketUrl:
    (VITE_NOTIFICATION_WS_URL as string | undefined) ??
    'ws://api.threadly.kr/ws/notifications',
};
