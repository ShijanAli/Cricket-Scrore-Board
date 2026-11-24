import type { ReactNode } from 'react';
import { CricketBall, Stumps } from '@/components/art/CricketArt';

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 px-6 py-12 text-center">
      <div className="relative mb-1 flex items-end gap-1">
        <Stumps className="h-16 w-12" />
        <CricketBall className="mb-0.5 size-7" />
      </div>
      <p className="text-lg font-bold">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
