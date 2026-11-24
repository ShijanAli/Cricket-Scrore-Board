import type { BallLog } from '@cricket/shared';
import { cn } from '@/lib/utils';

const tone = (b: BallLog) =>
  b.isWicket
    ? 'border-transparent bg-gradient-to-br from-rose-500 to-red-600 text-white shadow shadow-red-500/30'
    : b.totalRuns >= 6
      ? 'border-transparent bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow shadow-violet-500/30'
      : b.totalRuns >= 4
        ? 'border-transparent bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow shadow-blue-500/30'
        : !b.legal
          ? 'border-amber-300 bg-amber-100 text-amber-900'
          : b.totalRuns > 0
            ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
            : 'border-slate-200 bg-slate-100 text-slate-600';

/** The balls of the current over, newest last. */
export function OverStrip({ balls }: { balls: readonly BallLog[] }) {
  if (balls.length === 0) return <p className="text-sm text-muted-foreground">New over</p>;
  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="This over">
      {balls.map((b) => (
        <li key={b.eventId} className={cn('flex h-10 min-w-10 items-center justify-center rounded-full border-2 px-1.5 text-sm font-bold', tone(b))}>
          {b.label}
        </li>
      ))}
    </ol>
  );
}
