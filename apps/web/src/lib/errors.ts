import type { ApiFailure } from '@/app/api/baseApi';

const isFailure = (e: unknown): e is ApiFailure =>
  typeof e === 'object' && e !== null && 'status' in e && 'code' in e && 'message' in e;

/** Human message for anything a query, mutation or `unwrap()` can throw. */
export function errorMessage(e: unknown): string {
  if (isFailure(e)) return e.status === 0 ? 'No connection. Check your internet and try again.' : e.message;
  if (typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return 'Something went wrong';
}

export const isNetworkError = (e: unknown): boolean => isFailure(e) && e.status === 0;
