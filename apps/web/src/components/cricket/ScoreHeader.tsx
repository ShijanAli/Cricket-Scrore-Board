import { oversFromBalls, runRate } from '@cricket/engine';
import type { InningsState } from '@cricket/shared';
import { CricketBall, CricketBat, FieldBackdrop } from '@/components/art/CricketArt';
import { Badge } from '@/components/ui/badge';

export interface ScoreHeaderProps {
  teamName: string;
  state: InningsState;
}

/** Big score line: runs/wickets, overs, run rate and (second innings) what is needed. */
export function ScoreHeader({ teamName, state }: ScoreHeaderProps) {
  const overs = oversFromBalls(state.legalBalls, state.ballsPerOver);
  const crr = runRate(state.runs, state.legalBalls, state.ballsPerOver);
  const ballsLeft = state.maxBalls - state.legalBalls;
  const need = state.target !== null ? Math.max(0, state.target - state.runs) : null;
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-600 p-5 text-white shadow-xl shadow-teal-900/20">
      <FieldBackdrop className="pointer-events-none absolute inset-0 size-full opacity-60" />
      <CricketBat className="pointer-events-none absolute top-3 right-4 h-28 rotate-[35deg] opacity-95 drop-shadow-xl" />
      <CricketBall className="animate-spin-slow pointer-events-none absolute top-6 right-24 size-10 drop-shadow-lg" />
      <div className="relative space-y-2">
        <p className="text-sm font-semibold tracking-wide text-white/80 uppercase">{teamName}</p>
        <div className="flex items-end gap-3">
          <span className="text-6xl font-extrabold tracking-tight tabular-nums drop-shadow">
            {state.runs}/{state.wickets}
          </span>
          <span className="mb-2 text-xl font-semibold text-white/80">({overs} ov)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold backdrop-blur">CRR {crr.toFixed(2)}</span>
          {state.freeHit ? <Badge variant="warning">FREE HIT</Badge> : null}
        </div>
        {need !== null ? (
          <p className="rounded-xl bg-black/20 px-3 py-2 text-sm font-semibold backdrop-blur">
            Need <span className="text-yellow-300">{need}</span> from <span className="text-yellow-300">{ballsLeft}</span> {ballsLeft === 1 ? 'ball' : 'balls'} · Target {state.target}
          </p>
        ) : null}
      </div>
    </div>
  );
}
