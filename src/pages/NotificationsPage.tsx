import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { InfiniteData } from '@tanstack/react-query';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
  deleteAllNotifications,
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/notifications';
import type { FetchNotificationsParams } from '@/api/notifications';
import { NotificationListItem } from '@/components/NotificationListItem';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';
import { buildErrorMessage } from '@/utils/errorMessage';
import type { NotificationItem, NotificationListResponse, NotificationWebSocketMessage } from '@/types/notifications';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

const NOTIFICATION_QUERY_KEY = ['notifications'];

type PageCursor = { cursorTimestamp: string; cursorId: string };
type NotificationsQueryData = InfiniteData<NotificationListResponse, PageCursor | undefined>;
type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');

  const notificationsQuery = useInfiniteQuery<
    NotificationListResponse,
    Error,
    InfiniteData<NotificationListResponse, PageCursor | undefined>,
    typeof NOTIFICATION_QUERY_KEY,
    PageCursor | undefined
  >({
    queryKey: NOTIFICATION_QUERY_KEY,
    queryFn: ({ pageParam }) => fetchNotifications(pageParam as FetchNotificationsParams | undefined),
    initialPageParam: undefined as PageCursor | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNext && lastPage.nextCursor) {
        return {
          cursorTimestamp: lastPage.nextCursor.timestamp,
          cursorId: lastPage.nextCursor.id,
        } satisfies PageCursor;
      }
      return undefined;
    },
  });

  const notifications = useMemo<NotificationItem[]>(() => {
    if (!notificationsQuery.data) {
      return [];
    }
    return notificationsQuery.data.pages.flatMap((page) => page.items);
  }, [notificationsQuery.data]);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const { fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = notificationsQuery;

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isLoading) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isLoading]);

  useIntersectionObserver(loadMoreRef, handleLoadMore, { rootMargin: '200px' });

  const updateCache = (updater: (item: NotificationItem) => NotificationItem | null) => {
    queryClient.setQueryData<NotificationsQueryData>(NOTIFICATION_QUERY_KEY, (prev) => {
      if (!prev) {
        return prev;
      }
      const pages = prev.pages.map((page) => ({
        ...page,
        items: page.items
          .map((item) => updater(item))
          .filter((item): item is NotificationItem => item !== null),
      }));
      return { ...prev, pages };
    });
  };

  const markReadMutation = useMutation({
    mutationFn: (notification: NotificationItem) => markNotificationRead(notification.eventId),
    onMutate: (notification) => {
      updateCache((item) =>
        item.eventId === notification.eventId ? { ...item, isRead: true } : item,
      );
    },
    onError: (error) => {
      toast.error(buildErrorMessage(error, '알림 읽음 처리에 실패했습니다.'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (notification: NotificationItem) => deleteNotification(notification.eventId),
    onMutate: (notification) => {
      updateCache((item) => (item.eventId === notification.eventId ? null : item));
    },
    onError: (error) => {
      toast.error(buildErrorMessage(error, '알림 삭제에 실패했습니다.'));
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY });
      toast.success('모든 알림을 읽음 처리했습니다.');
    },
    onError: (error) => {
      toast.error(buildErrorMessage(error, '전체 읽음 처리에 실패했습니다.'));
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => deleteAllNotifications(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY });
      toast.success('모든 알림을 삭제했습니다.');
    },
    onError: (error) => {
      toast.error(buildErrorMessage(error, '전체 삭제에 실패했습니다.'));
    },
  });

  const handleOpen = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification);
    }
    navigate(`/notifications/${notification.eventId}`);
  };

  const handleMarkRead = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification);
    }
  };

  const handleDelete = (notification: NotificationItem) => {
    deleteMutation.mutate(notification);
  };

  useNotificationSocket(
    (message: NotificationWebSocketMessage) => {
      if (message.type !== 'NOTIFICATION') {
        return;
      }
      const preview = message.payload?.preview;
      const toastMessage = preview?.body ?? '새로운 알림이 도착했습니다.';
      toast.info(toastMessage, { autoClose: 4000 });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY });
    },
    {
      onConnect: () => setConnectionStatus('connected'),
      onDisconnect: () => setConnectionStatus('reconnecting'),
    },
  );

  useEffect(() => {
    if (connectionStatus === 'idle') {
      setConnectionStatus('connecting');
    }
  }, [connectionStatus]);

  const connectionClass =
    connectionStatus === 'connected'
      ? 'status-indicator status-indicator--online'
      : 'status-indicator status-indicator--offline';

  const connectionLabel =
    connectionStatus === 'connected'
      ? '실시간 연결됨'
      : connectionStatus === 'reconnecting'
        ? '재연결 중'
        : '연결 준비 중';

  const queryErrorMessage = notificationsQuery.isError
    ? buildErrorMessage(notificationsQuery.error, '알림을 불러오지 못했습니다.')
    : null;

  return (
    <div className="notifications-layout">
      <header className="notifications-header">
        <div>
          <h1>알림</h1>
          <p>Threadly 활동에 대한 최신 알림을 확인하세요.</p>
        </div>
        <div className="notifications-header__actions">
          <span className={connectionClass}>{connectionLabel}</span>
          <button
            type="button"
            className="btn"
            disabled={markAllMutation.isPending || notifications.length === 0}
            onClick={() => markAllMutation.mutate()}
          >
            모두 읽음 처리
          </button>
          <button
            type="button"
            className="btn btn--danger"
            disabled={deleteAllMutation.isPending || notifications.length === 0}
            onClick={() => {
              if (confirm('정말 모든 알림을 삭제하시겠습니까?')) {
                deleteAllMutation.mutate();
              }
            }}
          >
            모두 삭제
          </button>
        </div>
      </header>

      {notificationsQuery.isLoading ? (
        <div className="notifications-empty">알림을 불러오는 중입니다...</div>
      ) : notificationsQuery.isError ? (
        <div className="notifications-empty">
          <p>{queryErrorMessage}</p>
          <button type="button" className="btn" onClick={() => notificationsQuery.refetch()}>
            다시 시도
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="notifications-empty">표시할 알림이 없습니다.</div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification: NotificationItem) => (
            <NotificationListItem
              key={notification.eventId}
              notification={notification}
              onOpen={handleOpen}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {notifications.length > 0 ? (
        <div ref={loadMoreRef} className="notifications-footer">
          {notificationsQuery.isFetchingNextPage ? <span className="feed-loading">불러오는 중...</span> : null}
          {!notificationsQuery.hasNextPage ? (
            <span className="feed-end">모든 알림을 확인했습니다.</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default NotificationsPage;
