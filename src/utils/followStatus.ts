import type { FollowStatus } from '@/features/profile/types';

export const getFollowButtonLabel = (status: FollowStatus): string | null => {
  switch (status) {
    case 'APPROVED':
      return '팔로잉';
    case 'PENDING':
      return '요청 취소';
    case 'SELF':
      return null;
    default:
      return '팔로우';
  }
};

export const isFollowActionInProgress = (status: FollowStatus) =>
  status === 'PENDING';
