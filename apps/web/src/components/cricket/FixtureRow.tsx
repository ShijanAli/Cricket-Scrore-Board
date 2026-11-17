import { isFinished, sideLabel, type MatchSummary } from '@cricket/client-core';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDate, formatTime } from '@/lib/format';
import { matchHref, type LinkMode } from '@/lib/paths';

export function FixtureRow({ match, mode = 'app' }: { match: MatchSummary; mode?: LinkMode }) {
  const when = [formatDate(match.scheduledDate), formatTime(match.scheduledTime), match.ground].filter(Boolean).join(' · ');
  return (
    <Link to={matchHref(mode, match.id)} className="block rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
      <Card className="gap-1 py-4 transition-shadow hover:shadow-md">
        <CardContent className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Match {match.matchNo}</span>
            <StatusBadge status={match.status} />
          </div>
          <p className="font-medium">
            {sideLabel(match, 'A')} vs {sideLabel(match, 'B')}
          </p>
          <p className="text-xs text-muted-foreground">{when || 'Date not set'}</p>
          {isFinished(match.status) && match.resultText ? <p className="text-sm text-muted-foreground">{match.resultText}</p> : null}
        </CardContent>
      </Card>
    </Link>
  );
}
