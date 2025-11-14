import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { BouncingDotsLoader } from '@/components/BouncingDotsLoader';
import { deleteNotification, fetchNotificationDetail, markNotificationRead } from '@/api/notifications';
import { NetworkErrorFallback } from '@/components/NetworkErrorFallback';
import { buildNotificationText } from '@/utils/notificationMessage';
import type { NotificationItem } from '@/types/notifications';
import { formatRelativeTime } from '@/utils/date';
import clsx from 'clsx';
import { buildErrorMessage } from '@/utils/errorMessage';
import { getProfileImageUrl } from '@/utils/profileImage';
import { isNetworkUnavailableError } from '@/utils/networkError';

const NotificationDetailPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!eventId) {
      navigate('/notifications', { replace: true });
    }
  }, [eventId, navigate]);

  const detailQuery = useQuery({
    queryKey: ['notification', eventId],
    queryFn: () => fetchNotificationDetail(eventId ?? ''),
    enabled: Boolean(eventId),
  });

  const {
    mutate: markRead,
    isPending: isMarkingRead,
  } = useMutation({
    mutationFn: () => markNotificationRead(eventId ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      toast.error(buildErrorMessage(error, '알림 읽음 처리에 실패했습니다.'));
    },
  });

  const { mutate: removeNotification, isPending: isRemoving } = useMutation({
    mutationFn: () => deleteNotification(eventId ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      navigate('/notifications');
    },
    onError: (error) => {
      toast.error(buildErrorMessage(error, '알림 삭제에 실패했습니다.'));
    },
  });

  useEffect(() => {
    if (!eventId) {
      return;
    }
    const notification = detailQuery.data;
    if (notification && !notification.isRead && !isMarkingRead) {
      markRead();
    }
  }, [eventId, detailQuery.data, isMarkingRead, markRead]);

  const renderMetadata = (notification: NotificationItem) => {
    const meta = notification.metadata;
    switch (meta.type) {
      case 'POST_LIKE':
        return (
          <div className="detail-metadata">
            <span className="detail-label">게시글 ID</span>
            <span>{meta.postId}</span>
            {meta.postTitle ? (
              <>
                <span className="detail-label">제목</span>
                <span>{meta.postTitle}</span>
              </>
            ) : null}
          </div>
        );
      case 'COMMENT_ADDED':
        return (
          <div className="detail-metadata">
            <span className="detail-label">게시글 ID</span>
            <span>{meta.postId}</span>
            <span className="detail-label">댓글 ID</span>
            <span>{meta.commentId}</span>
            {meta.commentExcerpt || meta.commentContent ? (
              <>
                <span className="detail-label">댓글</span>
                <span>{meta.commentExcerpt ?? meta.commentContent}</span>
              </>
            ) : null}
          </div>
        );
      case 'COMMENT_LIKE':
        return (
          <div className="detail-metadata">
            <span className="detail-label">게시글 ID</span>
            <span>{meta.postId}</span>
            <span className="detail-label">댓글 ID</span>
            <span>{meta.commentId}</span>
          </div>
        );
      case 'FOLLOW_REQUEST':
      case 'FOLLOW':
      case 'FOLLOW_ACCEPT':
      default:
        return (
          <div className="detail-metadata">
            <span className="detail-label">알림 타입</span>
            <span>{meta.type}</span>
          </div>
        );
    }
  };

  if (detailQuery.isLoading) {
    return (
      <div className="notifications-layout">
        <BouncingDotsLoader message="알림을 불러오는 중입니다..." />
      </div>
    );
  }

  if (detailQuery.isError && isNetworkUnavailableError(detailQuery.error)) {
    return (
      <div className="notifications-layout">
        <NetworkErrorFallback className="notifications-empty" />
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    const detailErrorMessage = detailQuery.isError
      ? buildErrorMessage(detailQuery.error, '알림을 불러오지 못했습니다.')
      : '알림을 불러오지 못했습니다.';
    return (
      <div className="notifications-layout">
        <div className="notifications-empty">{detailErrorMessage}</div>
        <button type="button" className="btn" onClick={() => navigate('/notifications')}>
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const notification = detailQuery.data;
  const actorAvatarUrl = getProfileImageUrl(notification.actorProfile.profileImageUrl);
  const { title, description } = buildNotificationText(notification);

  return (
    <div className="detail-layout">
      <button type="button" className="btn btn--secondary" onClick={() => navigate(-1)}>
        뒤로가기
      </button>
      <div className="detail-card">
        <div className="detail-header">
          <div className="detail-avatar">
            <img src={actorAvatarUrl} alt="avatar" />
          </div>
          <div className="detail-header__content">
            <h2>{title}</h2>
            <p>{description}</p>
            <span className="detail-time">{formatRelativeTime(notification.occurredAt)}</span>
          </div>
          <span
            className={clsx('detail-badge', notification.isRead ? 'detail-badge--read' : 'detail-badge--unread')}
          >
            {notification.isRead ? '읽음' : '읽지 않음'}
          </span>
        </div>

        <section className="detail-section">
          <h3>보낸 사람</h3>
          <div className="detail-grid">
            <span className="detail-label">닉네임</span>
            <span>{notification.actorProfile.nickname || '알 수 없음'}</span>
            <span className="detail-label">ID</span>
            <span>{notification.actorProfile.userId || '알 수 없음'}</span>
          </div>
        </section>

        <section className="detail-section">
          <h3>알림 정보</h3>
          <div className="detail-grid">
            <span className="detail-label">이벤트 ID</span>
            <span>{notification.eventId}</span>
            <span className="detail-label">수신자 ID</span>
            <span>{notification.receiverId}</span>
            <span className="detail-label">타입</span>
            <span>{notification.notificationType}</span>
          </div>
        </section>

        <section className="detail-section">
          <h3>연관 데이터</h3>
          {renderMetadata(notification)}
        </section>

        <section className="detail-section">
          <h3>조치</h3>
          <div className="detail-actions">
            {!notification.isRead ? (
              <button
                type="button"
                className="btn"
                onClick={() => markRead()}
                disabled={isMarkingRead}
              >
                읽음 처리
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn--danger"
              disabled={isRemoving}
              onClick={() => {
                if (confirm('해당 알림을 삭제하시겠습니까?')) {
                  removeNotification();
                }
              }}
            >
              삭제
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default NotificationDetailPage;
