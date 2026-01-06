import { QueryClient } from '@tanstack/react-query';

// Configure React Query client with optimal defaults for caching
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes (300 seconds)
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests up to 3 times
      retry: 3,
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus by default (can be overridden per query)
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
  },
});
