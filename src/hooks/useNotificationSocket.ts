import { useEffect, useRef } from 'react';

import { ensureFreshAccessToken } from '@/api/http';
import { appConfig } from '@/config/env';
import { useAuthStore } from '@/store/authStore';
import type { NotificationWebSocketMessage } from '@/types/notifications';

const MAX_BACKOFF = 30000;
const BASE_DELAY = 2000;

interface SocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export const useNotificationSocket = (
  onNotification: (message: NotificationWebSocketMessage) => void,
  options: SocketOptions = {},
) => {
  const tokens = useAuthStore((state) => state.tokens);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    let isUnmounted = false;

    const cleanupSocket = () => {
      if (socketRef.current) {
        socketRef.current.onopen = null;
        socketRef.current.onclose = null;
        socketRef.current.onmessage = null;
        socketRef.current.onerror = null;
        socketRef.current.close(1000);
        socketRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (isUnmounted || !tokens) {
        return;
      }
      const delay = Math.min(MAX_BACKOFF, BASE_DELAY * 2 ** attemptsRef.current);
      attemptsRef.current += 1;
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
      }
      reconnectRef.current = setTimeout(connect, delay);
    };

    const connect = async () => {
      if (!tokens || isUnmounted) {
        return;
      }
      try {
        const accessToken = await ensureFreshAccessToken();
        if (!accessToken) {
          throw new Error('No access token available');
        }
        cleanupSocket();
        const socketUrl = `${appConfig.notificationWebSocketUrl}?token=${encodeURIComponent(accessToken)}`;
        const ws = new WebSocket(socketUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          attemptsRef.current = 0;
          options.onConnect?.();
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data) as NotificationWebSocketMessage;
            if (payload.type === 'NOTIFICATION') {
              onNotification(payload);
              if (payload.eventId) {
                const ack = JSON.stringify({ type: 'ACK', lastReceivedId: payload.eventId });
                ws.send(ack);
              }
            }
          } catch (error) {
            console.error('Failed to parse notification message', error);
          }
        };

        ws.onerror = () => {
          ws.close();
        };

        ws.onclose = () => {
          if (!isUnmounted) {
            options.onDisconnect?.();
            scheduleReconnect();
          }
        };
      } catch (error) {
        console.error('Failed to connect WebSocket', error);
        scheduleReconnect();
      }
    };

    if (tokens) {
      connect();
    }

    return () => {
      isUnmounted = true;
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
      }
      cleanupSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens]);
};
