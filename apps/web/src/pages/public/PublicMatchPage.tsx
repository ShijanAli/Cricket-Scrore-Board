import { isLive, teamName } from '@cricket/client-core';
import { Link2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { MatchScoreboard } from '@/components/cricket/MatchScoreboard';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useWatchedMatch } from '@/features/live/useLiveMatch';
import { formatDate, formatTime } from '@/lib/format';
import { paths } from '@/lib/paths';

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied');
  } catch {
    toast.error('Could not copy the link');
  }
}

/** What a spectator sees: no login, live by itself. */
export function PublicMatchPage() {
  const { id = '' } = useParams();
  const { query, connected } = useWatchedMatch(id);
  const m = query.data;
  const when = m ? [formatDate(m.scheduledDate), formatTime(m.scheduledTime), m.ground].filter(Boolean).join(' · ') : '';
  return (
    <>
      <PageHeader
        title={m ? `${teamName(m, m.teamAId)} v ${teamName(m, m.teamBId)}` : 'Match'}
        description={when || undefined}
        backTo={m?.tournamentId ? paths.publicTournament(m.tournamentId) : m?.seriesId ? paths.publicSeries(m.seriesId) : paths.home}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void copyLink()}>
              <Link2 /> Share
            </Button>
            {m?.canScore ? (
              <Button asChild size="sm">
                <Link to={paths.app.match(id)}>Open scorer</Link>
              </Button>
            ) : null}
          </>
        }
      />
      <QueryBoundary query={query}>
        {(match) => (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={match.status} />
              {isLive(match.status) ? <Badge variant={connected ? 'success' : 'secondary'}>{connected ? 'Real-time' : 'Updating every few seconds'}</Badge> : null}
            </div>
            {match.resultText ? (
              <Card className="bg-primary/10">
                <CardContent>
                  <p className="text-lg font-semibold">{match.resultText}</p>
                </CardContent>
              </Card>
            ) : null}
            <MatchScoreboard match={match} />
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
