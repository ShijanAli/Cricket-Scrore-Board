import { ApiError } from '@cricket/client-core';
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

/** Plain object (not an Error) so it stays serializable inside the Redux store. */
export interface ApiFailure {
  status: number;
  code: string;
  message: string;
}

export function toFailure(e: unknown): ApiFailure {
  if (e instanceof ApiError) return { status: e.status, code: e.code, message: e.message };
  return { status: -1, code: 'UNKNOWN', message: e instanceof Error ? e.message : 'Something went wrong' };
}

/** Run a shared-API call and shape the result for RTK Query. Network, retry and refresh live in ApiClient. */
export async function call<T>(fn: () => Promise<T>): Promise<{ data: T } | { error: ApiFailure }> {
  try {
    return { data: await fn() };
  } catch (e) {
    return { error: toFailure(e) };
  }
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fakeBaseQuery<ApiFailure>(),
  // Show what we already have instantly, refresh quietly in the background:
  // data stays cached for 5 minutes after the last screen using it closes, and is re-checked on
  // mount only when it is older than 30 seconds. (Spinners show on the first load only.)
  keepUnusedDataFor: 300,
  refetchOnMountOrArgChange: 30,
  refetchOnFocus: false, // with a slow link, refetching every query on each tab switch is the opposite of smooth
  refetchOnReconnect: true,
  tagTypes: ['Teams', 'Team', 'Matches', 'Match', 'Live', 'Tournaments', 'Tournament', 'Notices', 'Fixtures', 'Standings', 'SeriesList', 'Series'],
  endpoints: () => ({}),
});
