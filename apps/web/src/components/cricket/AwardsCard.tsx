import { bowlingFigures, type AwardPlayer } from '@cricket/client-core';
import { Crown, Medal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useGetSeriesAwardsQuery } from '@/features/series/seriesApi';
import { useGetTournamentAwardsQuery } from '@/features/tournaments/tournamentsApi';

const Award = ({ label, p, detail }: { label: string; p: AwardPlayer | null; detail: string }) =>
  p ? (
    <div className="rounded-lg bg-card p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-semibold">{p.name}</p>
      <p className="text-xs text-muted-foreground">{p.teamName}</p>
      <p className="mt-1 text-sm tabular-nums">{detail}</p>
      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">Why?</summary>
        <p className="mt-1">{p.reason}</p>
      </details>
    </div>
  ) : null;

/** Champion, runner-up, Man of the Series/Tournament and the leaders, each with the reason. Hidden until a match is completed. */
export function AwardsCard({ scope, id }: { scope: 'tournament' | 'series'; id: string }) {
  const tournament = useGetTournamentAwardsQuery(id, { skip: scope !== 'tournament' });
  const series = useGetSeriesAwardsQuery(id, { skip: scope !== 'series' });
  const a = (scope === 'tournament' ? tournament : series).data;
  if (!a || a.matchesCounted === 0) return null;
  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100">
      <CardContent className="space-y-4">
        {a.champion ? (
          <div className="flex items-start gap-3">
            <Crown className="mt-1 size-7 text-amber-500" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Champions</p>
              <p className="text-xl font-bold">{a.champion.name}</p>
              {a.champion.reason ? <p className="text-sm text-muted-foreground">{a.champion.reason}</p> : null}
              {a.runnerUp ? <p className="text-sm text-muted-foreground">Runners-up: {a.runnerUp.name}</p> : null}
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-2 font-semibold">
            <Medal className="size-5 text-amber-500" /> Leaders so far
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Award label={a.champion ? a.bestPlayerTitle : 'Best player'} p={a.bestPlayer} detail={a.bestPlayer ? `${a.bestPlayer.runs} runs · ${a.bestPlayer.wickets} wkts` : ''} />
          <Award label="Top run scorer" p={a.topRunScorer} detail={a.topRunScorer ? `${a.topRunScorer.runs} runs · ${a.topRunScorer.sixes}×6 ${a.topRunScorer.fours}×4` : ''} />
          <Award label="Top wicket taker" p={a.topWicketTaker} detail={a.topWicketTaker ? bowlingFigures(a.topWicketTaker) : ''} />
          <Award label="Most sixes" p={a.mostSixes} detail={a.mostSixes ? `${a.mostSixes.sixes} sixes` : ''} />
        </div>
        <p className="text-xs text-muted-foreground">{a.formula}</p>
      </CardContent>
    </Card>
  );
}
