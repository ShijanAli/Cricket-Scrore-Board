import { isFinished, type MatchSummary } from '@cricket/client-core';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TeamBadge } from '@/components/common/TeamBadge';
import { formatDate } from '@/lib/format';
import { matchHref, type LinkMode } from '@/lib/paths';

export function MatchCard({ match, mode = 'app' }: { match: MatchSummary; mode?: LinkMode }) {
  const a = match.teamA;
  const b = match.teamB;
  return (
    <Link to={matchHref(mode, match.id)} className="block rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
      <Card className="gap-3 transition-shadow hover:shadow-md">
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <StatusBadge status={match.status} />
            {match.scheduledDate ? <span className="text-xs text-muted-foreground">{formatDate(match.scheduledDate)}</span> : null}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <TeamBadge shortName={a?.shortName ?? '?'} color={a?.color} />
              <span className="w-full truncate text-center text-sm font-medium">{a?.name ?? 'TBD'}</span>
            </div>
            <span className="text-xs text-muted-foreground">vs</span>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <TeamBadge shortName={b?.shortName ?? '?'} color={b?.color} />
              <span className="w-full truncate text-center text-sm font-medium">{b?.name ?? 'TBD'}</span>
            </div>
          </div>
          {isFinished(match.status) && match.resultText ? <p className="text-center text-sm text-muted-foreground">{match.resultText}</p> : null}
          {match.ground ? <p className="text-center text-xs text-muted-foreground">{match.ground}</p> : null}
        </CardContent>
      </Card>
    </Link>
  );
}
