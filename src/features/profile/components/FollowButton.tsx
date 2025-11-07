import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';

import { fetchUserProfile } from '@/features/profile/api/profileApi';
import type { FollowStatus } from '@/features/profile/types';
import { useFollowActions } from '@/hooks/useFollowActions';

interface FollowButtonProps {
  userId: string;
  followStatus?: FollowStatus;
  fetchStatus?: boolean;
  invalidateKeys?: { queryKey: unknown[] }[];
  appearance?: 'auto' | 'primary' | 'secondary';
  className?: string;
  pendingLabel?: string;
  stopPropagation?: boolean;
  disabled?: boolean;
}

export const FollowButton = ({
  userId,
  followStatus,
  fetchStatus = false,
  invalidateKeys,
  appearance = 'auto',
  className,
  pendingLabel = '처리 중...',
  stopPropagation = true,
  disabled = false,
}: FollowButtonProps) => {
  const shouldFetchStatus = Boolean(fetchStatus && !followStatus);

  const profileQuery = useQuery({
    queryKey: ['user', userId, 'follow-basic'],
    queryFn: () => fetchUserProfile(userId),
    enabled: shouldFetchStatus,
    staleTime: 60_000,
  });

  const effectiveStatus = followStatus ?? profileQuery.data?.followStatus ?? 'NONE';

  const followActions = useFollowActions({
    userId,
    followStatus: effectiveStatus,
    invalidateKeys,
  });

  const label = followActions.buttonLabel;
  if (!label) {
    return null;
  }

  const resolvedAppearance =
    appearance === 'auto'
      ? followActions.followStatus === 'APPROVED'
        ? 'secondary'
        : 'primary'
      : appearance;

  const buttonClassName = clsx(
    'btn',
    resolvedAppearance === 'secondary' ? 'btn--secondary' : 'btn--primary',
    className,
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
    followActions.toggleFollow();
  };

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={handleClick}
      disabled={disabled || followActions.isProcessing}
    >
      {followActions.isProcessing ? pendingLabel : label}
    </button>
  );
};

export default FollowButton;
