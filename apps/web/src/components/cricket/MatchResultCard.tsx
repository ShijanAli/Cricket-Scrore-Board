import { buildReportView, type MatchDetail, type ReportTeamLine } from '@cricket/client-core';
import { Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const Line = ({ t, margin, tone }: { t: ReportTeamLine; margin: string; tone: 'win' | 'lose' }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="min-w-0">
      <p className={tone === 'win' ? 'truncate font-semibold' : 'truncate text-muted-foreground'}>{t.name}</p>
      <p className="text-xs text-muted-foreground">{margin}</p>
    </div>
    <p className={tone === 'win' ? 'text-xl font-bold tabular-nums' : 'text-lg tabular-nums text-muted-foreground'}>
      {t.score} <span className="text-xs font-normal">({t.overs} ov)</span>
    </p>
  </div>
);

/** Finished match: who won, who lost, by how much, plus Man of the Match. Falls back to the plain result text. */
export function MatchResultCard({ match }: { match: MatchDetail }) {
  const r = buildReportView(match);
  if (!r) {
    return match.resultText ? (
      <Card className="border-amber-200 bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100">
        <CardContent>
          <p className="text-lg font-semibold">{match.resultText}</p>
        </CardContent>
      </Card>
    ) : null;
  }
  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100">
      <CardContent className="space-y-4">
        <p className="flex items-center gap-2 text-lg font-semibold">
          <Trophy className="size-5 text-amber-500" /> {r.resultText}
        </p>
        {r.winner && r.loser ? (
          <div className="space-y-2">
            <Line t={r.winner} margin={r.winner.margin} tone="win" />
            <Line t={r.loser} margin={r.loser.margin} tone="lose" />
          </div>
        ) : (
          <div className="space-y-2">
            {r.teams.map((t) => (
              <Line key={t.teamId} t={t} margin="" tone="win" />
            ))}
          </div>
        )}
        {r.awards.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {r.awards.map((a) => (
              <div key={a.label} className="rounded-lg bg-card p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{a.label}</p>
                <p className="font-semibold">{a.playerName}</p>
                <p className="text-xs text-muted-foreground">{a.teamName}</p>
                <p className="mt-1 text-sm tabular-nums">{a.line}</p>
                {a.reason ? (
                  <details className="mt-2 text-xs text-muted-foreground">
                    <summary className="cursor-pointer font-medium text-foreground">Why?</summary>
                    <p className="mt-1">{a.reason}</p>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
