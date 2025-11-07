import { useQuery } from '@tanstack/react-query';

import { fetchMyProfile } from '@/features/profile/api/profileApi';

const MY_PROFILE_QUERY_KEY = ['me', 'profile', 'basic'] as const;

export const useMyProfileQuery = () => {
  return useQuery({
    queryKey: MY_PROFILE_QUERY_KEY,
    queryFn: fetchMyProfile,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export type UseMyProfileQueryResult = ReturnType<typeof useMyProfileQuery>;
