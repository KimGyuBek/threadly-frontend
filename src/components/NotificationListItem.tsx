import type { NotificationItem } from '@/types/notifications';
import { buildNotificationText } from '@/utils/notificationMessage';
import { formatRelativeTime } from '@/utils/date';
import clsx from 'clsx';
import { getProfileImageUrl } from '@/utils/profileImage';

interface Props {
  notification: NotificationItem;
  onOpen: (notification: NotificationItem) => void;
  onMarkRead: (notification: NotificationItem) => void;
  onDelete: (notification: NotificationItem) => void;
}

export const NotificationListItem = ({ notification, onOpen, onMarkRead, onDelete }: Props) => {
  const { title, description } = buildNotificationText(notification);
  const timestamp = formatRelativeTime(notification.occurredAt);
  const actorAvatarUrl = getProfileImageUrl(notification.actorProfile.profileImageUrl);

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
        <img src={actorAvatarUrl} alt="avatar" loading="lazy" />
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
