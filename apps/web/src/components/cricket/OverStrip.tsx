import type { BallLog } from '@cricket/shared';
import { cn } from '@/lib/utils';

const tone = (b: BallLog) =>
  b.isWicket ? 'bg-destructive text-white border-transparent' : b.totalRuns >= 4 ? 'bg-primary text-primary-foreground border-transparent' : !b.legal ? 'bg-warning/15 text-warning' : 'bg-background';

/** The balls of the current over, newest last. */
export function OverStrip({ balls }: { balls: readonly BallLog[] }) {
  if (balls.length === 0) return <p className="text-sm text-muted-foreground">New over</p>;
  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="This over">
      {balls.map((b) => (
        <li key={b.eventId} className={cn('flex h-9 min-w-9 items-center justify-center rounded-full border px-1.5 text-xs font-semibold', tone(b))}>
          {b.label}
        </li>
      ))}
    </ol>
  );
}
