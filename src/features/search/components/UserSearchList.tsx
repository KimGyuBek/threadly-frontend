import { useNavigate } from 'react-router-dom';

import type { SearchUser } from '../types';

interface UserSearchListProps {
  users: SearchUser[];
}

const FOLLOW_STATUS_LABEL: Record<SearchUser['followStatus'], string | null> = {
  NONE: null,
  PENDING: '요청됨',
  APPROVED: '팔로잉',
  REJECTED: null,
  SELF: '나',
};

export const UserSearchList = ({ users }: UserSearchListProps) => {
  const navigate = useNavigate();

  if (users.length === 0) {
    return null;
  }

  return (
    <ul className="search-user-list">
      {users.map((user) => {
        const statusLabel = FOLLOW_STATUS_LABEL[user.followStatus];
        return (
          <li key={user.userId}>
            <button
              type="button"
              className="search-user-item"
              onClick={() => {
                if (user.followStatus === 'SELF') {
                  navigate('/profile');
                } else {
                  navigate(`/users/${user.userId}`);
                }
              }}
            >
              <div className="search-user-avatar">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt={user.nickname || user.userId} />
                ) : (
                  <span>{user.nickname?.charAt(0) ?? user.userId.charAt(0)}</span>
                )}
              </div>
              <div className="search-user-info">
                <span className="search-user-name">{user.nickname || user.userId}</span>
                <span className="search-user-username">@{user.userId}</span>
              </div>
              {statusLabel ? <span className="search-user-status">{statusLabel}</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default UserSearchList;
