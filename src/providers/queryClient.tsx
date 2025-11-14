import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { isNetworkUnavailableError } from '@/utils/networkError';

const DEFAULT_MAX_FAILURES = 2; // equivalent to retry: 1

const shouldRetryRequest = (failureCount: number, error: unknown, maxFailures: number): boolean => {
  if (isNetworkUnavailableError(error)) {
    return false;
  }
  return failureCount < maxFailures;
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => shouldRetryRequest(failureCount, error, DEFAULT_MAX_FAILURES),
      },
    },
  });

export const QueryProvider = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(createQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
