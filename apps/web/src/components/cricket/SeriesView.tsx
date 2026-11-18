import type { SeriesDetail } from '@cricket/client-core';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { LinkMode } from '@/lib/paths';
import { AwardsCard } from './AwardsCard';
import { FixtureRow } from './FixtureRow';

/** Series score line and its matches. Read-only, so the public page and the dashboard share it. */
export function SeriesView({ series: s, mode }: { series: SeriesDetail; mode: LinkMode }) {
  const winner = s.score.winnerTeamId === s.teamAId ? s.teamA : s.score.winnerTeamId === s.teamBId ? s.teamB : null;
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">
            Best of {s.matchCount} · first to {s.score.needed}
          </p>
          <div className="flex items-center gap-6">
            <span className="font-semibold">{s.teamA.name}</span>
            <span className="text-4xl font-bold tabular-nums">
              {s.score.winsA} - {s.score.winsB}
            </span>
            <span className="font-semibold">{s.teamB.name}</span>
          </div>
          {winner ? <Badge variant="success">{winner.name} won the series</Badge> : <Badge variant="live">In progress</Badge>}
        </CardContent>
      </Card>
      <AwardsCard scope="series" id={s.id} />
      <section className="space-y-3">
        <h2 className="font-semibold">Matches</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {s.matches.map((m) => (
            <FixtureRow key={m.id} match={{ ...m, teamA: s.teamA, teamB: s.teamB }} mode={mode} />
          ))}
        </div>
      </section>
    </div>
  );
}
