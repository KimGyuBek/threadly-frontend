import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import {
  followUser,
  unfollowUser,
  cancelFollowRequest,
} from '@/features/profile/api/profileApi';
import type { FollowStatus } from '@/features/profile/types';
import { buildErrorMessage } from '@/utils/errorMessage';

interface UseFollowActionsParams {
  userId: string;
  followStatus: FollowStatus;
  invalidateKeys?: { queryKey: unknown[] }[];
}

export const useFollowActions = ({
  userId,
  followStatus,
  invalidateKeys = [],
}: UseFollowActionsParams) => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<FollowStatus>(followStatus);

  useEffect(() => {
    setStatus(followStatus);
  }, [followStatus]);

  const followMutation = useMutation<FollowStatus, unknown, FollowStatus, FollowStatus>({
    mutationFn: async (currentStatus) => {
      if (!userId) {
        throw new Error('userId is required');
      }
      if (currentStatus === 'APPROVED') {
        await unfollowUser(userId);
        return 'NONE';
      }
      if (currentStatus === 'PENDING') {
        await cancelFollowRequest(userId);
        return 'NONE';
      }
      const newStatus = await followUser(userId);
      return newStatus;
    },
    onMutate: async (currentStatus) => {
      setStatus((prev) => {
        if (prev === 'APPROVED' || prev === 'PENDING') {
          return 'NONE';
        }
        return 'PENDING';
      });
      return currentStatus;
    },
    onSuccess: (newStatus) => {
      setStatus(newStatus);
      invalidateKeys.forEach(({ queryKey }) => queryClient.invalidateQueries({ queryKey }));
    },
    onError: (error, _vars, context) => {
      setStatus(context ?? followStatus);
      toast.error(buildErrorMessage(error, '팔로우 처리에 실패했습니다.'));
    },
  });

  const toggleFollow = useCallback(() => {
    if (!userId) {
      toast.error('대상 사용자 정보를 확인할 수 없습니다.');
      return;
    }
    followMutation.mutate(status);
  }, [followMutation, status, userId]);

  const buttonLabel = useMemo(() => {
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
  }, [status]);

  return {
    followStatus: status,
    toggleFollow,
    buttonLabel,
    isProcessing: followMutation.isPending,
  };
};
