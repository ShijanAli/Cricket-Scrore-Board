import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { errorMessage } from '@/lib/errors';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

/** The part of an RTK Query result this component needs. */
export interface QueryLike<T> {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => unknown;
}

export function Spinner({ className = 'py-16' }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`} role="status" aria-label="Loading">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}

export interface QueryBoundaryProps<T> {
  query: QueryLike<T>;
  children: (data: T) => ReactNode;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
}

/** Loading, error, empty and data states for one query, so no page repeats them. */
export function QueryBoundary<T>({ query, children, isEmpty, empty }: QueryBoundaryProps<T>) {
  if (query.isLoading) return <Spinner />;
  if (query.isError && query.data === undefined) {
    return <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />;
  }
  if (query.data === undefined) return <Spinner />;
  if (isEmpty?.(query.data)) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  return <>{children(query.data)}</>;
}
