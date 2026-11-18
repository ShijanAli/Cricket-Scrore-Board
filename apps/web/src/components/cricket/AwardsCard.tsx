import { bowlingFigures, type AwardPlayer } from '@cricket/client-core';
import { Crown, Medal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useGetSeriesAwardsQuery } from '@/features/series/seriesApi';
import { useGetTournamentAwardsQuery } from '@/features/tournaments/tournamentsApi';

const Award = ({ label, p, detail }: { label: string; p: AwardPlayer | null; detail: (p: AwardPlayer) => string }) =>
  p ? (
    <div className="rounded-lg bg-card p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-semibold">{p.name}</p>
      <p className="text-xs text-muted-foreground">{p.teamName}</p>
      <p className="mt-1 text-sm tabular-nums">{detail(p)}</p>
    </div>
  ) : null;

/** Champion, runner-up, Man of the Series and the batting/bowling leaders. Hidden until a match is completed. */
export function AwardsCard({ scope, id }: { scope: 'tournament' | 'series'; id: string }) {
  const tournament = useGetTournamentAwardsQuery(id, { skip: scope !== 'tournament' });
  const series = useGetSeriesAwardsQuery(id, { skip: scope !== 'series' });
  const a = (scope === 'tournament' ? tournament : series).data;
  if (!a || a.matchesCounted === 0) return null;
  return (
    <Card className="bg-primary/10">
      <CardContent className="space-y-4">
        {a.champion ? (
          <div className="flex items-center gap-3">
            <Crown className="size-7 text-amber-500" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Champions</p>
              <p className="text-xl font-bold">{a.champion.name}</p>
              {a.runnerUp ? <p className="text-sm text-muted-foreground">Runners-up: {a.runnerUp.name}</p> : null}
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-2 font-semibold">
            <Medal className="size-5 text-amber-500" /> Series leaders so far
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          <Award label={a.champion ? 'Man of the Series' : 'Best player'} p={a.manOfTheSeries} detail={(p) => `${p.runs} runs · ${p.wickets} wkts`} />
          <Award label="Top run scorer" p={a.topRunScorer} detail={(p) => `${p.runs} runs · ${p.sixes}×6 ${p.fours}×4`} />
          <Award label="Top wicket taker" p={a.topWicketTaker} detail={(p) => bowlingFigures(p)} />
        </div>
      </CardContent>
    </Card>
  );
}
