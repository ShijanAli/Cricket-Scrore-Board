import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      // Do not hammer the server when the user is offline or the request is simply wrong.
      retry: (count, error) => (error instanceof ApiError && (error.isNetwork || error.status >= 500) ? count < 2 : false),
    },
  },
});

/** One place for every query key, so invalidation never misses a screen. */
export const keys = {
  teams: ['teams'] as const,
  team: (id: string) => ['teams', id] as const,
  matches: ['matches'] as const,
  liveMatches: ['matches', 'live'] as const,
  match: (id: string) => ['matches', 'detail', id] as const,
  tournaments: ['tournaments'] as const,
  tournament: (id: string) => ['tournaments', id] as const,
  fixtures: (id: string) => ['tournaments', id, 'fixtures'] as const,
  standings: (id: string) => ['tournaments', id, 'standings'] as const,
  seriesList: ['series'] as const,
  series: (id: string) => ['series', id] as const,
};

/** Human message for any thrown value. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.isNetwork ? 'No connection. Check your internet and try again.' : e.message;
  if (e instanceof Error) return e.message;
  return 'Something went wrong';
}
