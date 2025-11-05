import type { NotificationItem } from '@/types/notifications';
import { buildNotificationText } from '@/utils/notificationMessage';
import { formatRelativeTime } from '@/utils/date';
import clsx from 'clsx';

interface Props {
  notification: NotificationItem;
  onOpen: (notification: NotificationItem) => void;
  onMarkRead: (notification: NotificationItem) => void;
  onDelete: (notification: NotificationItem) => void;
}

export const NotificationListItem = ({ notification, onOpen, onMarkRead, onDelete }: Props) => {
  const { title, description } = buildNotificationText(notification);
  const timestamp = formatRelativeTime(notification.occurredAt);

  return (
    <div
      className={clsx('notification-item', { 'notification-item--unread': !notification.isRead })}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(notification)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          onOpen(notification);
        }
      }}
    >
      <div className="notification-item__avatar">
        {notification.actorProfile.profileImageUrl ? (
          <img src={notification.actorProfile.profileImageUrl} alt="avatar" loading="lazy" />
        ) : (
          <span className="notification-item__avatar-placeholder">
            {notification.actorProfile.nickname?.charAt(0) ?? '?'}
          </span>
        )}
      </div>
      <div className="notification-item__content">
        <div className="notification-item__header">
          <span className="notification-item__title">{title}</span>
          <span className="notification-item__time">{timestamp}</span>
        </div>
        <p className="notification-item__description">{description}</p>
      </div>
      <div className="notification-item__actions" onClick={(event) => event.stopPropagation()}>
        {!notification.isRead ? (
          <button
            type="button"
            className="notification-item__action"
            onClick={() => onMarkRead(notification)}
          >
            읽음
          </button>
        ) : null}
        <button type="button" className="notification-item__action notification-item__action--danger" onClick={() => onDelete(notification)}>
          삭제
        </button>
      </div>
    </div>
  );
};
