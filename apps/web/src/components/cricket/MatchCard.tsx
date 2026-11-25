import { isFinished, type MatchSummary } from '@cricket/client-core';
import { Link } from 'react-router-dom';
import { CricketBall } from '@/components/art/CricketArt';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TeamBadge } from '@/components/common/TeamBadge';
import { matchesApi } from '@/features/matches/matchesApi';
import { formatDate } from '@/lib/format';
import { matchHref, type LinkMode } from '@/lib/paths';

export function MatchCard({ match, mode = 'app' }: { match: MatchSummary; mode?: LinkMode }) {
  const a = match.teamA;
  const b = match.teamB;
  // Start loading the match the moment the pointer or keyboard reaches the card, so the page is ready by the time it opens.
  const prefetch = matchesApi.usePrefetch('getMatch');
  const warm = () => prefetch(match.id, { ifOlderThan: 30 });
  return (
    <Link to={matchHref(mode, match.id)} onPointerEnter={warm} onFocus={warm} className="block rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
      <Card className="group relative gap-3 overflow-hidden pt-0 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/10">
        <div className="h-1.5" style={{ backgroundImage: `linear-gradient(90deg, ${a?.color ?? '#10b981'}, ${b?.color ?? '#0ea5e9'})` }} />
        <CricketBall className="pointer-events-none absolute -right-5 -bottom-5 size-20 opacity-[0.07] transition-transform duration-500 group-hover:rotate-90" />
        <CardContent className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <StatusBadge status={match.status} />
            {match.scheduledDate ? <span className="text-xs text-muted-foreground">{formatDate(match.scheduledDate)}</span> : null}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <TeamBadge shortName={a?.shortName ?? '?'} color={a?.color} />
              <span className="w-full truncate text-center text-sm font-semibold">{a?.name ?? 'TBD'}</span>
            </div>
            <span className="rounded-full bg-gradient-to-br from-amber-300 to-orange-400 px-2 py-1 text-[10px] font-extrabold text-amber-950 shadow">VS</span>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <TeamBadge shortName={b?.shortName ?? '?'} color={b?.color} />
              <span className="w-full truncate text-center text-sm font-semibold">{b?.name ?? 'TBD'}</span>
            </div>
          </div>
          {isFinished(match.status) && match.resultText ? <p className="rounded-lg bg-emerald-50 px-2 py-1 text-center text-sm font-medium text-emerald-800">{match.resultText}</p> : null}
          {match.ground ? <p className="text-center text-xs text-muted-foreground">{match.ground}</p> : null}
        </CardContent>
      </Card>
    </Link>
  );
}
