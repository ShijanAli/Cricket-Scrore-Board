import { oversFromBalls, runRate } from '@cricket/engine';
import type { InningsState } from '@cricket/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

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
    <Card>
      <CardContent className="space-y-1">
        <p className="text-sm text-muted-foreground">{teamName}</p>
        <div className="flex items-end gap-3">
          <span className="text-5xl font-bold tabular-nums">
            {state.runs}/{state.wickets}
          </span>
          <span className="mb-1.5 text-lg font-semibold text-muted-foreground">({overs} ov)</span>
        </div>
        <p className="text-sm text-muted-foreground">CRR {crr.toFixed(2)}</p>
        {need !== null ? (
          <p className="text-sm font-semibold text-primary">
            Need {need} from {ballsLeft} {ballsLeft === 1 ? 'ball' : 'balls'} · Target {state.target}
          </p>
        ) : null}
        {state.freeHit ? <Badge variant="warning">FREE HIT</Badge> : null}
      </CardContent>
    </Card>
  );
}
