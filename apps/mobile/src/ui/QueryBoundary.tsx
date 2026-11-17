import type { UseQueryResult } from '@tanstack/react-query';
import { errorMessage } from '@/lib/query';
import { EmptyState, ErrorBanner, Loading } from './states';

export interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>;
  /** Return true when there is nothing to show; renders `empty`. */
  isEmpty?: (data: T) => boolean;
  empty?: React.ReactNode;
  children: (data: T) => React.ReactNode;
}

/**
 * Loading / error / empty / data in one place so no screen repeats it.
 * Cached data keeps showing while a background refetch fails (offline friendly).
 */
export function QueryBoundary<T>({ query, isEmpty, empty, children }: QueryBoundaryProps<T>) {
  if (query.data === undefined) {
    if (query.isError) return <ErrorBanner message={errorMessage(query.error)} onRetry={() => void query.refetch()} />;
    return <Loading />;
  }
  if (isEmpty?.(query.data)) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  return <>{children(query.data)}</>;
}
